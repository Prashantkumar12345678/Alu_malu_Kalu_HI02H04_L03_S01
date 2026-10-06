var ExtensionId = chrome.runtime.id;
var extnUrl = "https://extn.webstart.page/chrome/?eid=" + ExtensionId;

chrome.storage.local.get(['vid', 'channel'], (items) => {
    extnUrl = extnUrl + "&vid=" + items.vid + "&ch=" + items.channel;
});

window.onload = function () {
    setNewTabPage();
};

function setNewTabPage() {
    var newTabFrame = document.getElementById("tab-frame");
    if (newTabFrame) {
        newTabFrame.src = extnUrl;
    }
}
