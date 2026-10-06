var origin = window.location.protocol + '//' + window.location.hostname;

function handleClickEventForLinks(ev) {
    if (ev.target.tagName === "A") {
        var evtTgt = ev.target;
        if (evtTgt.getAttribute("target") === "_self") {
            evtTgt.setAttribute("target", "_top");
        }
    }
}

function fetchTopSites(eventData) {
    if (eventData.data.id == "fetchTopSites") {
        chrome.runtime.sendMessage({ data: "getTopSites" }, handleTopSitesResponse);
    }
}

function handleTopSitesResponse(mostVisitedURLs) {
    if (mostVisitedURLs) {
        var topSitesData = [];
        var faviconPrefix = "https://www.google.com/s2/favicons?domain=";

        for (var i = 0; i < mostVisitedURLs.length; i++) {
            var siteData = mostVisitedURLs[i];
            if (siteData) {
                var favicon = faviconPrefix + siteData["url"];
                topSitesData.push({
                    "title": siteData["title"],
                    "siteUrl": siteData["url"],
                    "icon": favicon
                });
            }
        }

        window.postMessage({
            name: "topSitesResponse",
            topSitesInfo: JSON.stringify(topSitesData)
        }, origin);
    }
}

window.addEventListener("click", handleClickEventForLinks, false);
window.addEventListener("message", fetchTopSites, false);
