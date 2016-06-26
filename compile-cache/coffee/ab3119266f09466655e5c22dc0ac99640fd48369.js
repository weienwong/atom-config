(function() {
  var DB, OpenRecent, minimatch;

  minimatch = null;

  DB = (function() {
    function DB(key) {
      this.key = key;
    }

    DB.prototype.getData = function() {
      var data;
      data = localStorage[this.key];
      data = data != null ? JSON.parse(data) : {};
      return data;
    };

    DB.prototype.setData = function(data) {
      return localStorage[this.key] = JSON.stringify(data);
    };

    DB.prototype.removeData = function() {
      return localStorage.removeItem(this.key);
    };

    DB.prototype.get = function(name) {
      var data;
      data = this.getData();
      return data[name];
    };

    DB.prototype.set = function(name, value) {
      var data;
      data = this.getData();
      data[name] = value;
      return this.setData(data);
    };

    DB.prototype.remove = function(name) {
      var data;
      data = this.getData();
      delete data[name];
      return this.setData(data);
    };

    return DB;

  })();

  OpenRecent = (function() {
    function OpenRecent() {
      this.eventListenerDisposables = [];
      this.commandListenerDisposables = [];
      this.localStorageEventListener = this.onLocalStorageEvent.bind(this);
      this.db = new DB('openRecent');
    }

    OpenRecent.prototype.onUriOpened = function() {
      var editor, filePath, _ref, _ref1;
      editor = atom.workspace.getActiveTextEditor();
      filePath = editor != null ? (_ref = editor.buffer) != null ? (_ref1 = _ref.file) != null ? _ref1.path : void 0 : void 0 : void 0;
      if (!filePath) {
        return;
      }
      if (!filePath.indexOf('://' === -1)) {
        return;
      }
      if (filePath) {
        return this.insertFilePath(filePath);
      }
    };

    OpenRecent.prototype.onProjectPathChange = function(projectPaths) {
      return this.insertCurrentPaths();
    };

    OpenRecent.prototype.onLocalStorageEvent = function(e) {
      if (e.key === this.db.key) {
        return this.update();
      }
    };

    OpenRecent.prototype.encodeEventName = function(s) {
      s = s.replace('-', '\u2010');
      s = s.replace(':', '\u02D0');
      return s;
    };

    OpenRecent.prototype.commandEventName = function(prefix, path) {
      return "open-recent:" + prefix + "-" + (this.encodeEventName(path));
    };

    OpenRecent.prototype.addCommandListeners = function() {
      var disposable, index, path, _fn, _fn1, _i, _j, _len, _len1, _ref, _ref1;
      _ref = this.db.get('files');
      _fn = (function(_this) {
        return function(path) {
          var disposable;
          disposable = atom.commands.add("atom-workspace", _this.commandEventName("File" + index, path), function() {
            return _this.openFile(path);
          });
          return _this.commandListenerDisposables.push(disposable);
        };
      })(this);
      for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
        path = _ref[index];
        _fn(path);
      }
      _ref1 = this.db.get('paths');
      _fn1 = (function(_this) {
        return function(path) {
          var disposable;
          disposable = atom.commands.add("atom-workspace", _this.commandEventName("Dir" + index, path), function() {
            return _this.openPath(path);
          });
          return _this.commandListenerDisposables.push(disposable);
        };
      })(this);
      for (index = _j = 0, _len1 = _ref1.length; _j < _len1; index = ++_j) {
        path = _ref1[index];
        _fn1(path);
      }
      disposable = atom.commands.add("atom-workspace", "open-recent:clear-all" + '-'.repeat(1024), (function(_this) {
        return function() {
          _this.db.set('files', []);
          _this.db.set('paths', []);
          return _this.update();
        };
      })(this));
      return this.commandListenerDisposables.push(disposable);
    };

    OpenRecent.prototype.getProjectPath = function(path) {
      var _ref;
      return (_ref = atom.project.getPaths()) != null ? _ref[0] : void 0;
    };

    OpenRecent.prototype.openFile = function(path) {
      return atom.workspace.open(path);
    };

    OpenRecent.prototype.openPath = function(path) {
      var options, replaceCurrentProject, workspaceElement;
      replaceCurrentProject = false;
      options = {};
      if (!this.getProjectPath() && atom.config.get('open-recent.replaceNewWindowOnOpenDirectory')) {
        replaceCurrentProject = true;
      } else if (this.getProjectPath() && atom.config.get('open-recent.replaceProjectOnOpenDirectory')) {
        replaceCurrentProject = true;
      }
      if (replaceCurrentProject) {
        atom.project.setPaths([path]);
        if (workspaceElement = atom.views.getView(atom.workspace)) {
          return atom.commands.dispatch(workspaceElement, 'tree-view:toggle-focus');
        }
      } else {
        return atom.open({
          pathsToOpen: [path],
          newWindow: !atom.config.get('open-recent.replaceNewWindowOnOpenDirectory')
        });
      }
    };

    OpenRecent.prototype.addListeners = function() {
      var disposable;
      this.addCommandListeners();
      disposable = atom.workspace.onDidOpen(this.onUriOpened.bind(this));
      this.eventListenerDisposables.push(disposable);
      disposable = atom.project.onDidChangePaths(this.onProjectPathChange.bind(this));
      this.eventListenerDisposables.push(disposable);
      return window.addEventListener("storage", this.localStorageEventListener);
    };

    OpenRecent.prototype.removeCommandListeners = function() {
      var disposable, _i, _len, _ref;
      _ref = this.commandListenerDisposables;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        disposable = _ref[_i];
        disposable.dispose();
      }
      return this.commandListenerDisposables = [];
    };

    OpenRecent.prototype.removeListeners = function() {
      var disposable, _i, _len, _ref;
      this.removeCommandListeners();
      _ref = this.eventListenerDisposables;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        disposable = _ref[_i];
        disposable.dispose();
      }
      this.eventListenerDisposables = [];
      return window.removeEventListener('storage', this.localStorageEventListener);
    };

    OpenRecent.prototype.init = function() {
      if (atom.config.get('open-recent.recentDirectories') || atom.config.get('open-recent.recentFiles')) {
        this.db.set('paths', atom.config.get('open-recent.recentDirectories'));
        this.db.set('files', atom.config.get('open-recent.recentFiles'));
        atom.config.unset('open-recent.recentDirectories');
        atom.config.unset('open-recent.recentFiles');
      }
      if (!this.db.get('paths')) {
        this.db.set('paths', []);
      }
      if (!this.db.get('files')) {
        this.db.set('files', []);
      }
      this.addListeners();
      this.insertCurrentPaths();
      return this.update();
    };

    OpenRecent.prototype.filterPath = function(path) {
      var ignoredNames, match, name, _i, _len;
      ignoredNames = atom.config.get('core.ignoredNames');
      if (ignoredNames) {
        if (minimatch == null) {
          minimatch = require('minimatch');
        }
        for (_i = 0, _len = ignoredNames.length; _i < _len; _i++) {
          name = ignoredNames[_i];
          match = [name, "**/" + name + "/**"].some(function(comparison) {
            return minimatch(path, comparison, {
              matchBase: true,
              dot: true
            });
          });
          if (match) {
            return true;
          }
        }
      }
      return false;
    };

    OpenRecent.prototype.insertCurrentPaths = function() {
      var index, maxRecentDirectories, path, projectDirectory, recentPaths, _i, _len, _ref;
      if (!(atom.project.getDirectories().length > 0)) {
        return;
      }
      recentPaths = this.db.get('paths');
      _ref = atom.project.getDirectories();
      for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
        projectDirectory = _ref[index];
        if (index > 0 && !atom.config.get('open-recent.listDirectoriesAddedToProject')) {
          continue;
        }
        path = projectDirectory.path;
        if (this.filterPath(path)) {
          continue;
        }
        index = recentPaths.indexOf(path);
        if (index !== -1) {
          recentPaths.splice(index, 1);
        }
        recentPaths.splice(0, 0, path);
        maxRecentDirectories = atom.config.get('open-recent.maxRecentDirectories');
        if (recentPaths.length > maxRecentDirectories) {
          recentPaths.splice(maxRecentDirectories, recentPaths.length - maxRecentDirectories);
        }
      }
      this.db.set('paths', recentPaths);
      return this.update();
    };

    OpenRecent.prototype.insertFilePath = function(path) {
      var index, maxRecentFiles, recentFiles;
      if (this.filterPath(path)) {
        return;
      }
      recentFiles = this.db.get('files');
      index = recentFiles.indexOf(path);
      if (index !== -1) {
        recentFiles.splice(index, 1);
      }
      recentFiles.splice(0, 0, path);
      maxRecentFiles = atom.config.get('open-recent.maxRecentFiles');
      if (recentFiles.length > maxRecentFiles) {
        recentFiles.splice(maxRecentFiles, recentFiles.length - maxRecentFiles);
      }
      this.db.set('files', recentFiles);
      return this.update();
    };

    OpenRecent.prototype.createSubmenu = function() {
      var index, menuItem, path, recentFiles, recentPaths, submenu, _i, _j, _len, _len1;
      submenu = [];
      submenu.push({
        command: "pane:reopen-closed-item",
        label: "Reopen Closed File"
      });
      submenu.push({
        type: "separator"
      });
      recentFiles = this.db.get('files');
      if (recentFiles.length) {
        for (index = _i = 0, _len = recentFiles.length; _i < _len; index = ++_i) {
          path = recentFiles[index];
          menuItem = {
            label: path,
            command: this.commandEventName("File" + index, path)
          };
          if (path.length > 100) {
            menuItem.label = path.substr(-60);
            menuItem.sublabel = path;
          }
          submenu.push(menuItem);
        }
        submenu.push({
          type: "separator"
        });
      }
      recentPaths = this.db.get('paths');
      if (recentPaths.length) {
        for (index = _j = 0, _len1 = recentPaths.length; _j < _len1; index = ++_j) {
          path = recentPaths[index];
          menuItem = {
            label: path,
            command: this.commandEventName("Dir" + index, path)
          };
          if (path.length > 100) {
            menuItem.label = path.substr(-60);
            menuItem.sublabel = path;
          }
          submenu.push(menuItem);
        }
        submenu.push({
          type: "separator"
        });
      }
      submenu.push({
        command: "open-recent:clear-all" + '-'.repeat(1024),
        label: "Clear List"
      });
      return submenu;
    };

    OpenRecent.prototype.updateMenu = function() {
      var dropdown, item, _i, _j, _len, _len1, _ref, _ref1, _results;
      _ref = atom.menu.template;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        dropdown = _ref[_i];
        if (dropdown.label === "File" || dropdown.label === "&File") {
          _ref1 = dropdown.submenu;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            item = _ref1[_j];
            if (item.command === "pane:reopen-closed-item" || item.label === "Open Recent") {
              delete item.accelerator;
              delete item.command;
              delete item.click;
              item.label = "Open Recent";
              item.enabled = true;
              if (item.metadata == null) {
                item.metadata = {};
              }
              item.metadata.windowSpecific = false;
              item.submenu = this.createSubmenu();
              atom.menu.update();
              break;
            }
          }
          break;
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    OpenRecent.prototype.update = function() {
      this.removeCommandListeners();
      this.updateMenu();
      return this.addCommandListeners();
    };

    OpenRecent.prototype.destroy = function() {
      return this.removeListeners();
    };

    return OpenRecent;

  })();

  module.exports = {
    config: {
      maxRecentFiles: {
        type: 'number',
        "default": 8
      },
      maxRecentDirectories: {
        type: 'number',
        "default": 8
      },
      replaceNewWindowOnOpenDirectory: {
        type: 'boolean',
        "default": true,
        description: 'When checked, opening a recent directory will "open" in the current window, but only if the window does not have a project path set. Eg: The window that appears when doing File > New Window.'
      },
      replaceProjectOnOpenDirectory: {
        type: 'boolean',
        "default": false,
        description: 'When checked, opening a recent directory will "open" in the current window, replacing the current project.'
      },
      listDirectoriesAddedToProject: {
        type: 'boolean',
        "default": false,
        description: 'When checked, the all root directories in a project will be added to the history and not just the 1st root directory.'
      },
      ignoredNames: {
        type: 'boolean',
        "default": true,
        description: 'When checked, skips files and directories specified in Atom\'s "Ignored Names" setting.'
      }
    },
    instance: null,
    activate: function() {
      this.instance = new OpenRecent();
      return this.instance.init();
    },
    deactivate: function() {
      this.instance.destroy();
      return this.instance = null;
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAiZmlsZSI6ICIiLAogICJzb3VyY2VSb290IjogIiIsCiAgInNvdXJjZXMiOiBbCiAgICAiL2hvbWUvd2VpLWVuLy5hdG9tL3BhY2thZ2VzL29wZW4tcmVjZW50L2xpYi9tYWluLmNvZmZlZSIKICBdLAogICJuYW1lcyI6IFtdLAogICJtYXBwaW5ncyI6ICJBQUFBO0FBQUEsTUFBQSx5QkFBQTs7QUFBQSxFQUFBLFNBQUEsR0FBWSxJQUFaLENBQUE7O0FBQUEsRUFHTTtBQUNTLElBQUEsWUFBRSxHQUFGLEdBQUE7QUFBUSxNQUFQLElBQUMsQ0FBQSxNQUFBLEdBQU0sQ0FBUjtJQUFBLENBQWI7O0FBQUEsaUJBRUEsT0FBQSxHQUFTLFNBQUEsR0FBQTtBQUNQLFVBQUEsSUFBQTtBQUFBLE1BQUEsSUFBQSxHQUFPLFlBQWEsQ0FBQSxJQUFDLENBQUEsR0FBRCxDQUFwQixDQUFBO0FBQUEsTUFDQSxJQUFBLEdBQVUsWUFBSCxHQUFjLElBQUksQ0FBQyxLQUFMLENBQVcsSUFBWCxDQUFkLEdBQW9DLEVBRDNDLENBQUE7QUFFQSxhQUFPLElBQVAsQ0FITztJQUFBLENBRlQsQ0FBQTs7QUFBQSxpQkFPQSxPQUFBLEdBQVMsU0FBQyxJQUFELEdBQUE7YUFDUCxZQUFhLENBQUEsSUFBQyxDQUFBLEdBQUQsQ0FBYixHQUFxQixJQUFJLENBQUMsU0FBTCxDQUFlLElBQWYsRUFEZDtJQUFBLENBUFQsQ0FBQTs7QUFBQSxpQkFVQSxVQUFBLEdBQVksU0FBQSxHQUFBO2FBQ1YsWUFBWSxDQUFDLFVBQWIsQ0FBd0IsSUFBQyxDQUFBLEdBQXpCLEVBRFU7SUFBQSxDQVZaLENBQUE7O0FBQUEsaUJBYUEsR0FBQSxHQUFLLFNBQUMsSUFBRCxHQUFBO0FBQ0gsVUFBQSxJQUFBO0FBQUEsTUFBQSxJQUFBLEdBQU8sSUFBQyxDQUFBLE9BQUQsQ0FBQSxDQUFQLENBQUE7QUFDQSxhQUFPLElBQUssQ0FBQSxJQUFBLENBQVosQ0FGRztJQUFBLENBYkwsQ0FBQTs7QUFBQSxpQkFpQkEsR0FBQSxH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

//# sourceURL=/home/wei-en/.atom/packages/open-recent/lib/main.coffee
