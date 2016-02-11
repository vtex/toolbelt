import path from 'path';
import fs from 'fs';
import shell from 'shelljs';
import Q from 'q';

import {
  getSandboxFiles,
  generateComponentFilesHash,
  generateRouteFilesHash,
  generateAreaFilesHash,
  passToChanges
} from './file-hash-generator';

let ChangeAction = {
  Save: 'save',
  Remove: 'remove'
};

let Path = {
  Routes: 'storefront/setup/routes.json',
  Areas: 'storefront/setup/areas.json',
  Components: 'storefront/components/',
  Component: 'storefront/component/',
  Assets: 'storefront/assets/',
  Root: process.cwd()
};

let buildSetUpChanges = (meta) => {
  return getSandboxFiles(meta).then((sandboxFiles) => {
    return discoverComponentChanges(sandboxFiles).then((componentChanges) => {
      return Q.all([discoverRouteChanges(sandboxFiles), discoverAreaChanges(sandboxFiles, componentChanges.components)])
        .spread((routeChanges, areaChanges) => {
          let route = getRouteChanges(routeChanges);
          let component = getComponentChanges(componentChanges);
          let areas = getAreasChanges(areaChanges, componentChanges.components);
          return route.concat(areas, component);
        });
    });
  });
};

let discoverComponentChanges = (sandboxFiles) => {
  let filterSandboxFiles = (sandboxFiles) => {
    let filesToCompare = {};
    Object.keys(sandboxFiles).forEach((file) => {
      if (isComponentFile(file)) {
        filesToCompare[file] = sandboxFiles[file];
      }
    });
    return filesToCompare;
  };

  let assetFiles = listFiles(Path.Assets);
  return Q.all(generateComponentFilesHash(assetFiles)).then((componentFiles) => {
      if (sandboxFiles != null) {
        let filesToCompare = filterSandboxFiles(sandboxFiles);
        return {
            changes: passToChanges(filesToCompare, componentFiles.fileHashes),
            components: componentFiles.merged
          };
      }
      return {
          changes: passToChanges(componentFiles.fileHashes),
          components: componentFiles.merged
        };
  });
};

let discoverRouteChanges = (sandboxFiles) => {
  let filterSandboxFiles = (sandboxFiles) => {
    let filesToCompare = {};
    Object.keys(sandboxFiles).forEach((file) => {
      if (isRouteFile(file)) {
        filesToCompare[file] = sandboxFiles[file];
      }
    });
    return filesToCompare;
  };

  return Q.all(generateRouteFilesHash(Path.Routes)).then((routeFiles) => {
      if (sandboxFiles != null) {
        let filesToCompare = filterSandboxFiles(sandboxFiles);
        return {
            changes: passToChanges(filesToCompare, routeFiles.fileHashes),
            routes: routeFiles.allRoutes
          };
      }
      return {
          changes: passToChanges(routeFiles.fileHashes),
          routes: componentFiles.allRoutes
        };
  });
};

let discoverAreaChanges = (sandboxFiles, componentAreas) => {
  let filterSandboxFiles = (sandboxFiles) => {
    let filesToCompare = {};
    Object.keys(sandboxFiles).forEach((file) => {
      if (isAreaFile(file)) {
        filesToCompare[file] = sandboxFiles[file];
      }
    });
    return filesToCompare;
  };

  return Q.all(generateAreaFilesHash(Path.Areas, componentAreas)).then((areaFiles) => {
    if (sandboxFiles != null) {
      let filesToCompare = filterSandboxFiles(sandboxFiles);
      return {
          changes: passToChanges(filesToCompare, areaFiles.fileHashes),
          areas: areaFiles.allAreas
      };
    }
    return {
        changes: passToChanges(areaFiles.fileHashes),
        areas: areaFiles.allAreas
    };
  });
};

let getComponentChanges = (componentChanges) => {
  componentChanges.changes = formatChanges(componentChanges.changes)

  let changes = [];
  componentChanges.changes.forEach((componentChange) => {
    if (componentChange.action === ChangeAction.Save) {
      let componentName = getFileName(componentChange.path);
      let content = componentChanges.components[componentName];
      changes.push(getChange(componentChange.path, content, componentChange.action));
    }

    if (componentChange.action === ChangeAction.Remove) {
      let change = { 'path': componentChange.path, 'action': componentChange.action };
      changes.push(change);
    }
  });
  return changes;
};

let getRouteChanges = (routeChanges) => {
  let changes = [];
  let routes = routeChanges.routes;
  routeChanges.changes = formatChanges(routeChanges.changes);

  routeChanges.changes.forEach((routeChange) => {
    if (routeChange.action === ChangeAction.Save) {
      let routeName = getFileName(routeChange.path);
      let content = routes[routeName];
      changes.push(getChange(routeChange.path, content, routeChange.action));
    }

    if (routeChange.action === ChangeAction.Remove) {
      changes.push({ 'path': routeChange.path, 'action': routeChange.action });
    }
  });

  return changes;
};

let getAreasChanges = (areaChanges, componentAreas) => {
 let allAreas = areaChanges.areas;
 let changes = [];
 areaChanges.changes = formatChanges(areaChanges.changes)

 let getAreaFromPath = (filePath) => {
   let regex = /storefront\/areas\/([^/]*)\/(.*).json/;
   let match = filePath.match(regex);
   if (match != null) {
     return { id: `/${match[2]}`, rootArea: `${match[1]}` };
   }

   let rootAreaPattern = /storefront\/areas\/([^/]*).json/;
   let result = filePath.match(rootAreaPattern);
   if (result != null) {
     return { id: '/', rootArea: result[1] };
   }
 };

 areaChanges.changes.forEach((areaChange) => {
   let area = getAreaFromPath(areaChange.path);
   let intention = getAreaIntention(area.id, componentAreas);

   let route = area ? allAreas[area.rootArea] : undefined;
   let locator = intention ? intention : area.id;

   try {
       if (areaChange.action === ChangeAction.Save) {
         changes.push(getChange(areaChange.path, route[locator], areaChange.action));
       } else {
         changes.push(areaChange);
       }
   } catch (err){ console.log(err); }
 });
 return changes;
};

let getAreaIntention = (areaId, componentAreas) => {
  let intentions = [];
  for (let component of Object.keys(componentAreas)) {
    let areas = componentAreas[component].areas;
    areas.forEach((area) => {
      if (area.id === areaId) {
        intentions.push(area.intention);
      }
    });
  };
  return intentions[0];
};

let filterSourceFiles = (files) => {
  return files.filter((item) => !isRoutesFile(item) && !isAreasFile(item));
};

let filterSourceChanges = (batch) => {
  let areaChanges = batch.filter((item) =>
    isAreasFile(normalizePath(item.path)));

  let routeChanges = batch.filter((item) =>
    isRoutesFile(normalizePath(item.path)));

  return batch.filter((item) => areaChanges.indexOf(item) === -1 &&
      routeChanges.indexOf(item) === -1);
};

let getFileName = (filePath) => { return path.basename(filePath, '.json'); };

let getAreasPathFromChanges = (batchChanges) => {
  let areasFile = batchChanges.filter((item) =>
    isAreasFile(item.path) && item.action === ChangeAction.Save);
  return areasFile.length > 0 ? areasFile[0].path : '';
};

let getSourceFiles = (files) => {
  return files.filter((item) => !isRoutesFile(item) && !isAreasFile(item));
};

let getAreasFilePath = (files) => {
  let areasFile = files.filter((item) => isAreasFile(item));
  return areasFile.length > 0 ? areasFile[0] : '';
};

let getRouteFilePath = (files) => {
  let areasFile = files.filter((item) => isRoutesFile(item));
  return areasFile.length > 0 ? areasFile[0] : '';
};

let isRouteFile = (filePath) => {
  let input = 'storefront/routes/';
  return filePath.substring(0, input.length) === input;
};

let isAreaFile = (filePath) => {
  let input = 'storefront/areas/';
  return filePath.substring(0, input.length) === input;
};

let isRoutesFile = (filePath) => {
  return filePath.substring(0, Path.Routes.length) === Path.Routes;
};

let isAreasFile = (filePath) => {
  return filePath.substring(0, Path.Areas.length) === Path.Areas;
};

let isComponentFile = (filePath) => {
  return filePath.substring(0, Path.Component.length) === Path.Component;
};

let normalizePath = (filePath) => {
  let root = path.resolve('');
  return filePath.substring(root.length + 1).replace(/\\/g, '/');
};

let listFiles = (filePath) => {
  let componentDir = normalizePath(`${Path.Root}/${filePath}`);
  return test('-e', componentDir) ? shell.ls('-R', componentDir) : [];
};

let getChange = (changePath, content, action) => {
  let base64 = new Buffer(JSON.stringify(content)).toString('base64');
  return {
    'path': changePath,
    'content': base64,
    'encoding': 'base64',
    'action': action
  }
};

let formatChanges = (changes) => {
  let batch = [];
  for (let filePath in changes) {
    let action = changes[filePath];
    if (action) {
      batch.push({
        action: action,
        path: filePath
      });
    }
  }
  return batch;
};

export {
  buildSetUpChanges,
  filterSourceChanges,
  filterSourceFiles,
  isRouteFile,
  isComponentFile,
  isAreaFile
};
