var newTabUrl = "chrome://newtab";

chrome.action.onClicked.addListener(
    function (tab) {
        chrome.tabs.create({ url: newTabUrl });
    }
);

chrome.runtime.onMessage.addListener(
    function (message, sender, sendResponse) {
        if (message.data == "getTopSites") {
            chrome.topSites.get(function (mostVisitedURL) {
                sendResponse(mostVisitedURL);
            });
        }
        return true;
    }
);
