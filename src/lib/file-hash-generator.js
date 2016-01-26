import path from 'path';
import fs from 'fs';
import Q from 'q';
import crypto from 'crypto';
import request from 'request';
import merge from 'deepmerge'

let ChangeAction = {
  Save: 'save',
  Remove: 'remove'
};

let generateFilesHash = (files) => {
  let root = process.cwd();
  let readAndHash = (filePath) => {
    return Q.nfcall(fs.readFile, path.resolve(root, filePath)).then((content) => {
      let hashedContent = crypto.createHash('md5').update(content, 'binary').digest('hex');
      return {
        path: filePath,
        hash: hashedContent
      };
    });
  };

  let filesPromise = [];
  files.forEach((file) => {
    filesPromise.push(readAndHash(file));
  });

  return Q.all(filesPromise).then(mapFilesHash);
};

let mapFilesHash = (filesArr) => {
  let filesAndHash = {};
  filesArr.forEach((file) => {
    filesAndHash[file.path] = {
      hash: file.hash
    };
  });
  return filesAndHash;
};

let passToChanges = (filesToLoop, filesToCompare) => {
  let changes = {};
  let filesToCompareExists = filesToCompare !== void 0;

  for (let file in filesToLoop) {
    if (!filesToCompareExists) {
      changes[file] = ChangeAction.Save;
    } else {
      if (filesToCompare[file] == null) {
        changes[file] = ChangeAction.Remove;
      } else {
        let hashCompare = filesToCompare[file].hash !== filesToLoop[file].hash;
        delete filesToCompare[file];
        if (hashCompare) {
          changes[file] = ChangeAction.Save;
        }
      }
    }
  }

  let compareKeys;
  if (!!filesToCompareExists) {
    compareKeys = Object.keys(filesToCompare).length;
  }

  if (compareKeys > 0) {
    for (let file in filesToCompare) {
      changes[file] = ChangeAction.Save;
    }
  }
  return changes;
};

let getSandboxFiles = ({ endpoint, vendor, sandbox, app, acceptHeader, token }) => {
  let options = {
    url: endpoint + '/' + vendor + '/sandboxes/' + sandbox + '/' + app + '/files',
    method: 'GET',
    headers: {
      Authorization: 'token ' + token,
      Accept: acceptHeader,
      'Content-Type': 'application/json',
      'x-vtex-accept-snapshot': false
    }
  };

  return Q.nfcall(request, options).then((data) => {
    let response = data[0];
    if (response.statusCode === 200) {
      return JSON.parse(response.body);
    } else if (response.statusCode === 404) {
      return void 0;
    }
    return console.error('Status:', response.statusCode);
  });
};

let filterCommonFiles = (files) => {
  let commonFiles = files.filter((item) => isCommonFile(item));
  return commonFiles.map((item) => path.basename(item)).filter((file) =>
    path.extname(file) != '.map');
};

let generateComponentFilesHash = (assetFiles) => {
  return Q.all([getComponentsAssets(assetFiles), getComponentsAreas(assetFiles)])
    .spread((assets, areas) => {
        try {
          let hashes = [];
          let merged = merge(assets, areas);

          Object.keys(merged).forEach((componentName) => {
            let componentPath = `storefront/component/${componentName}.json`;
            let componentHash = getHashContent(componentPath, merged[componentName]);
            hashes.push(componentHash);
          });
          let fileHashes = mapFilesHash(hashes);
          return { fileHashes, merged };
        } catch (error) { console.log(error); }
    });
};

let findId = (propsArr) => {
  let isId = (str) => {
    return str.substring(0, "id".length) === "id";
  };

  for (var i = 0; i < propsArr.length; i++) {
    if(isId(propsArr[i])) {
      return { id: propsArr[i].replace(/\"|\'|id:/g, '') };
    }
  }
};

let findIntention = (propsArr) => {
  let isIntention = (str) => {
    return str.substring(0, "intention".length) === "intention";
  };

  for (var i = 0; i < propsArr.length; i++) {
    if(isIntention(propsArr[i])) {
      return { intention: propsArr[i].replace(/\"|\'|intention:/g, '') };
    }
  }
};

let getComponentsAreas = (assetFiles) => {
  let assets = assetFiles.filter((item) => path.extname(item) === '.js');
  let regex = /(id|intention):\s*((\'\/(?:[^\']*)\'|\'\~(?:[^\']*)\')|(\"\/(?:[^\"]*)\"|\"\~(?:[^\"]*)\"))/g

  let mapAreaFiles = (filesArr) => {
    let files = {};
    filesArr.forEach((item) => {
      files[item.path] = {
        areas: item.areas
      }
    });
    return files;
  };

  let readFile = (filePath) => {
    return Q.nfcall(fs.readFile, path.resolve(process.cwd(), 'storefront/assets', filePath), 'utf8')
      .catch((error) => { return ''; })
      .then((content) => {
        let match = content.match(regex);
        let areas = [];
        if (match != null) {
          for (let i = 0; i < match.length; i=i+2) {
              let id = findId([match[i], match[i+1]]);
              let intention = findIntention([match[i], match[i+1]]);
              let area = merge(id, intention);
              areas.push(JSON.parse(JSON.stringify(area)));
          }
        }
        let componentName = filePath.substring(0, filePath.indexOf('/'));
        return { path: componentName, areas };
      });
  };

  let filesPromise = [];
  assets.forEach((file) => { filesPromise.push(readFile(file)); });

  return Q.all(filesPromise).then(mapAreaFiles);
};

let generateRouteFilesHash = (routePath) => {
  let root = process.cwd();
  let createRoutes = (data, filePath) => {
    try {
      let fileHashes = [];
      if (!data) return { fileHashes, allRoutes: {} };

      let json = JSON.parse(data);
      Object.keys(json).forEach((routeName) => {
        let routePath = `storefront/routes/${routeName}.json`;
        let routeHash = getHashContent(routePath, json[routeName]);
        fileHashes.push(routeHash);
      });
      return { fileHashes, allRoutes: json };
    } catch (error) { console.log(`${error} in ${filePath} file`); }
  };

  let readAndHash = (filePath) => {
    return Q.nfcall(fs.readFile, path.resolve(root, filePath), 'utf8')
      .catch((error) => { return null; })
      .then((data) => { return createRoutes(data, filePath); });
  };

  let filesPromise = [];
  filesPromise.push(readAndHash(routePath));
  return Q.all(filesPromise).spread((routes) => {
    routes.fileHashes = mapFilesHash(routes.fileHashes);
    return routes;
  });
};

let generateAreaFilesHash = (areaPath, componentAreas) => {
  let root = process.cwd();
  let hashAreas = (area, routeName, content) => {
    let areaName = area === '/' ? routeName : `${routeName}${area}`;
    let changePath = `storefront/areas/${areaName}.json`;
    return getHashContent(changePath, content);
  };

  let isIntention = (filePath) => {
   let input = "~";
   return filePath.substring(0, input.length) === input;
  };

  let getRouteAreas = (routeAreas, routeName) => {
    let hashes = [];
    Object.keys(routeAreas).forEach((area) => {
      if (isIntention(area)) {
        let areasForIntentions = getAreasForIntentions(area, componentAreas);
        areasForIntentions.forEach((areaId) => {
          let areaHashedContent = hashAreas(areaId, routeName, routeAreas[area]);
          hashes.push(areaHashedContent);
        });
      }
      else {
        let areaHashedContent = hashAreas(area, routeName, routeAreas[area]);
        hashes.push(areaHashedContent);
      }
    });
    return hashes;
  };

  let createAreas = (data, filePath) => {
    try {
      let hashes = [];
      if (!data) return { fileHashes: [], allAreas: {} };

      let json = JSON.parse(data);
      Object.keys(json).forEach((routeName) => {
        hashes.push(getRouteAreas(json[routeName], routeName));
      });

      let fileHashes = [];
      hashes.forEach((fileHash) => { fileHash.forEach((item) => fileHashes.push(item)); });
      return { fileHashes, allAreas: json };
    } catch (error) { console.log(`${error} in ${filePath} file`); }
  };

  let readAndHashArea = (filePath) => {
     return Q.nfcall(fs.readFile, path.resolve(root, filePath), 'utf8')
        .catch((error) => { return null; })
        .then((data) => { return createAreas(data, filePath); });
  };

  let filesPromise = [];
  filesPromise.push(readAndHashArea(areaPath));
  return Q.all(filesPromise).spread((areas) => {
    areas.fileHashes = mapFilesHash(areas.fileHashes);
    return areas;
  });
};

let getHashContent = (filePath, content) => {
  let hashedContent = crypto.createHash('md5').update(JSON.stringify(content)).digest('hex');
  return { path: filePath, hash: hashedContent};
};

let getComponentsAssets = (assetFiles) => {
  let commonFiles = filterCommonFiles(assetFiles);
  let assets = assetFiles.filter((item) => path.extname(item) === '.js');

  let componentes = {};
  assets.forEach((item) => {
    let componentName = item.substring(0, item.indexOf('/'));
    if (componentName === 'common') return;

    let asset = item.substring(componentName.length + 1);
    if (componentName in componentes) {
      let values = componentes[componentName].assets;
      componentes[componentName].assets = values.concat(asset);
    }
    else {
      componentes[componentName] = { assets: commonFiles.concat(asset) };
    }
  });
  return componentes;
};

let getAreasForIntentions = (areaName, componentAreas) => {
  let areasForIntentions = [];
  Object.keys(componentAreas).forEach((component) => {
    let areas = componentAreas[component].areas;
    areas.forEach((area) => {
      if (area.intention === areaName) {
        areasForIntentions.push(area.id);
      }
    });
  });
  return areasForIntentions;
};

let isCommonFile = (filePath) => {
  let input = 'common/';
  return filePath.substring(0, input.length) === input;
}

export {
  getSandboxFiles,
  generateComponentFilesHash,
  generateRouteFilesHash,
  generateAreaFilesHash,
  generateFilesHash,
  passToChanges
};
