var serviceWorker = self;
var scriptsUsedByRootSW = [
    "./scripts/background.js", "./scripts/ping.js"
];

scriptsUsedByRootSW.forEach(function (script) {
    try {
        self.importScripts(script);
    }
    catch (e) {
        console.log(e);
    }
});
