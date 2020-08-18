interface StrMap {
    [key: string]: string;
  }
  
  interface PackageJson {
    [key: string]: string | StrMap | boolean;
  }
  
  const removeUnecessaryKeys = (pkg: PackageJson): void => {
    let removeList: string[] = [];
    for (let key of Object.keys(pkg)) {
      if (key !== 'devDependencies') {
        removeList.push(key);
      }
    }
    for (let key of removeList) {
      if (typeof pkg[key] == 'string') {
        delete pkg[key];
      }
      if (typeof pkg[key] == 'object' && key !== 'devDependencies' && key !== 'peerDependencies' && key !== 'dependencies') {
        delete pkg[key];
      }
    }
  };
  
  export const blackListed = (key: string): boolean => {
    const patterns = ['typescript', 'tsdx', '@storybook'];
    const validator = new RegExp(patterns.join('|'), 'i');
  
    return validator.test(key);
  };
  
  const removeBlackListedDevDependencies = (pkg: PackageJson): void => {
    let removeList = [];
  
    for (let key in pkg['devDependencies'] as StrMap) {
      if (blackListed(key)) {
        removeList.push(key);
      }
    }
  
    for (let key of removeList) {
      delete (pkg['devDependencies'] as StrMap)[key];
    }
  };
  
  const addIOScripts = (pkg: PackageJson): void => {
    const IOScripts: StrMap = {
      test: 'vtex-test-tools test',
    };
  
    pkg['scripts'] = IOScripts;
  };
  
  export const adaptPackageJsonForRender = (pkg: PackageJson): void => {
    removeUnecessaryKeys(pkg);
    removeBlackListedDevDependencies(pkg);
    addIOScripts(pkg);
    return;
  };
  