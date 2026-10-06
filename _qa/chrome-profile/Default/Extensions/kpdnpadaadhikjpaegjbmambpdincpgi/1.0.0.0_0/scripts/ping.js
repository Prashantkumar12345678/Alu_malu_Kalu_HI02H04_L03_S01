var defaultVID = "1";
var defaultsUrl = "https://defaults.webstart.page/";
var removalFeedbackUrl = "https://webstart.page/feedback.html";

var manifestData = chrome.runtime.getManifest();
var ExtensionVersion = manifestData.version;
var ExtensionId = chrome.runtime.id;

var PING_ALARM = "EWS_PINGALARM";
var UPDATE_ALARM = "EWS_UPDATEALARM";

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == 'install') {
        var promise = new Promise((resolve, reject) => {
            chrome.storage.local.set({ 'vid': defaultVID });
            chrome.storage.local.set({ 'version': ExtensionVersion });
            resolve("organic");
        });

        promise
            .then(getsDefaultDetails)
            .then((details) => {
                chrome.storage.local.get(['vid', 'channel', 'machineId'], (items) => {
                    SendPingDetails("1", items.vid, items.channel, items.machineId);
                });

                let getPingAlarmInstall = chrome.alarms.get(PING_ALARM);
                getPingAlarmInstall.then(dailyPingAlarm);
            });
    } else if (details.reason == 'update') {
        let getPingAlarmUpdate = chrome.alarms.get(PING_ALARM);
        getPingAlarmUpdate.then(dailyPingAlarm);

        let getupdateAlarm = chrome.alarms.get(UPDATE_ALARM);
        getupdateAlarm.then(updatePingAlarm);

        chrome.storage.local.get(['version'], function (items) {
            if (!items.version || items.version != chrome.runtime.getManifest().version) {
                chrome.storage.local.set({ 'version': ExtensionVersion });
            }
        });
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === PING_ALARM) {
        chrome.storage.local.get(['vid', 'channel', 'machineId'], (items) => {
            SendPingDetails("2", items.vid, items.channel, items.machineId);

            var uninstallUrl = removalFeedbackUrl + "?extnId=" + ExtensionId + "&vid=" + items.vid + "&mid=" + items.machineId;
            chrome.runtime.setUninstallURL(uninstallUrl);
        });
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === UPDATE_ALARM) {
        chrome.storage.local.get(['vid', 'channel', 'machineId'], (items) => {
            SendPingDetails("3", items.vid, items.channel, items.machineId);
        });
    }
});

function getsDefaultDetails(channelId) {
    return new Promise((resolve) => {
        var details = {
            machineId: guid(),
            vid: "1",
            channel: channelId,
        };
        chrome.storage.local.get(['channel'], (items) => {
            chrome.cookies.get({ url: defaultsUrl, name: 'vid' }, function (cookie) {
                if (cookie) {
                    details.vid = cookie.value;
                    chrome.cookies.remove({ url: defaultsUrl, name: 'vid' });
                }
                chrome.storage.local.set(details, () => { resolve(details) });
            });

            if (!items.channel) {
                chrome.cookies.get({ url: defaultsUrl, name: 'channel' }, function (cookie) {
                    if (cookie) {
                        details.channel = cookie.value;
                        chrome.cookies.remove({ url: defaultsUrl, name: 'channel' });
                    }
                    chrome.storage.local.set(details, () => { resolve(details) });
                });
            }
        });
    });
}

function dailyPingAlarm(alarm) {
    if (!alarm) {
        chrome.alarms.create(PING_ALARM, {
            delayInMinutes: 1,
            periodInMinutes: 1440
        });
    }
}

function updatePingAlarm(alarm) {
    if (!alarm) {
        chrome.alarms.create(UPDATE_ALARM, {
            delayInMinutes: 1
        });
    }
}

function SendPingDetails(status, vid, channel, machineId) {
    var pingURL = 'http://ping.webstart.page/s/?';
    var _vid = !vid ? defaultVID : vid;
    var mid = (machineId == undefined || machineId == "" || machineId == null) ? guid() : machineId;

    pingURL = pingURL + 's=' + status + '&vid=' + _vid + '&mid=' + mid + '&ex=' + ExtensionId + '&ver=' + ExtensionVersion + "&ch=" + channel;
    pingURL = encodeURI(pingURL);
    fetch(pingURL);
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    var machineGUID = s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
    machineGUID = machineGUID.toLocaleUpperCase();
    chrome.storage.local.set({ 'machineId': machineGUID });
    return machineGUID;
}
