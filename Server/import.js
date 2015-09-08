/**
 * Created by love on 2015. 7. 1..
 */


var importConfig = function() {
    var path = require('path');
    var fs = require('fs');
    var importMaps = [];
    var ignores = [];
    var importTree = {};
    var rootDir = '';


    this.init = function(_rootPathStr, _ignores) {
        ignores = _ignores;
        _rootPathStr = path.resolve(_rootPathStr);
        rootDir = _rootPathStr.replace(/(.+)[/]/i,'');
        findModule(_rootPathStr);
    }


    this.include =function(_path){
        return findIncludePath(_path);
    }


    this.getImportTree = function() {
        return importTree;
    }

    function findModule(dir) {
        var dirs = fs.readdirSync(dir);
        for(var i = 0, n = dirs.length; i < n; ++i) {
            var currentPath = path.join(dir, dirs[i]);
            if(isIgnorePath(currentPath)) {
                continue;
            }
            var stat = fs.statSync(currentPath);
            if(stat.isDirectory()) {
                findModule(currentPath);
            } else if(stat.isFile() && currentPath.match(/^(.+).js$/i)) {
                importMaps.push({
                    path : currentPath,
                    include : currentPath.replace(/(.+)[/]/i, '').replace(/[.]js/i, '')
                });

                //addImportElementInTree(currentPath);
            }
        }
    }


    function isIgnorePath(currentPath) {
        for(var i = 0, n = ignores.length; i < n; ++i) {
            if(currentPath.match(ignores[i])) {
                return true;
            }
        }
        return false;
    }


    function findIncludePath(includePath) {
        for(var i = 0, n = importMaps.length; i < n; ++i) {
            var map =  importMaps[i];
            if(map.include === includePath || map.include === includePath.replace(/[/]/g, '.')) {
                return require(map.path);
            }
        }
        return undefined;
    }


    /*function addImportElementInTree(currentPath) {
        currentPath = currentPath.replace(/[.]js$/i,'');
        var startIndex = currentPath.lastIndexOf(rootDir);
        var relativePath = currentPath.substring(startIndex,currentPath.length);
        startIndex = relativePath.indexOf('/');
        relativePath = relativePath.substring(startIndex + 1,currentPath.length);
        var tree = importTree;
        var pathTree = relativePath.replace(/[/]{2,}/g,'/').replace(/^[/]/,'').split(/[.|/]/);
        for(var i = 0, n = pathTree.length; i < n; ++i ) {
            var elementName = pathTree[i];
            if(elementName.length === 0) continue;
            else if(i != n -1) {
                if(!tree[elementName]) {
                    tree[elementName] = {};
                }
                tree = tree[elementName];
            } else {
                tree[elementName] = require(currentPath);
            }
        }
    };
*/
    return this;

} ();



global._import = importConfig.getImportTree();
global._include = importConfig.include;
global.include = importConfig.include;
module.exports = importConfig;




