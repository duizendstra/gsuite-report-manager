/*global require, console, Promise*/
var google = require('googleapis');
var retry = require('retry');

function gsuiteReportManager(mainSpecs) {
    "use strict";
    var auth;
    var service = google.admin('reports_v1');

    function getUserUsage(specs) {
        return new Promise(function (resolve, reject) {
            var date = specs.date;
            var userKey = specs.userKey;

            var request = {
                auth: auth,
                date: date,
                userKey: userKey,
                fields: "nextPageToken,usageReports,warnings"
            };

            if (specs.parameters !== undefined) {
                request.parameters = specs.parameters;
            }

            if (specs.fields !== undefined) {
                request.fields = specs.fields;
            }

            var usageReports = [];

            function listUserUsage(pageToken) {
                if (pageToken) {
                    request.pageToken = pageToken;
                }

                var operation = retry.operation({
                    retries: 6,
                    factor: 3,
                    minTimeout: 1 * 1000,
                    maxTimeout: 60 * 1000,
                    randomize: true
                });

                operation.attempt(function () {
                    service.userUsageReport.get(request, function (err, response) {
                        //  console.log("setProperties");
                        if (operation.retry(err)) {
                            console.log("Warning, error %s occured, retry %d, %s usage.users.get", err.code, operation.attempts(), err.message);
                            return;
                        }
                        if (err) {
                            reject(operation.mainError());
                            return;
                        }

                        response.usageReports.forEach(function (usageReport) {
                            usageReports.push(usageReport);
                        });

                        if (usageReports.length === 0) {
                            resolve(usageReports);
                            return;
                        }
                        if (!response.nextPageToken) {
                            resolve(usageReports);
                            return;
                        }
                        listUserUsage(response.nextPageToken);
                    });
                });
            }
            listUserUsage();
        });
    }

    auth = mainSpecs.auth;
    return {
        getUserUsage: getUserUsage
    };
}
module.exports = gsuiteReportManager;