const NodeHelper = require("node_helper");
const request = require("request-promise");
const moment = require("moment");
const Log = require("../../js/logger");

module.exports = NodeHelper.create({
    // Log when the helper is started
    start: function() {
        console.log(`Starting node helper: ${this.name}`);
    },

    // Fetch JSON data from a URL
    async fetchJsonFromUrl(url) {
        try {
            const body = await request.get(url);
            return JSON.parse(body);
        } catch (error) {
            Log.error(`${this.name}: Error in request: ${error}`);
            return null;
        }
    },

    // Extract pickup dates from the JSON data
    extractPickupDates: function(jsonData) {
        let pickupDates = {};

        jsonData.forEach(({ plannedLoads }) => {
            plannedLoads.forEach(({ fractions, date }) => {
                fractions.forEach(fraction => {
                    if (!pickupDates[fraction]) {
                        pickupDates[fraction] = moment(date);
                    }
                });
            });
        });

        return pickupDates;
    },

    // Fetch pickup dates from the API
    async fetchPickupDates(kvhx) {
        const jsonData = await this.fetchJsonFromUrl(`https://portal-api.kredslob.dk/api/calendar/address/${kvhx}`);
    
        if (jsonData && jsonData.length > 0) {
            const pickupDates = this.extractPickupDates(jsonData);
            this.sendSocketNotification('PICKUP_DATES', pickupDates);
        } else {
            // If the portal-api returns empty data, return today's date with a "wasteType error"
            const today = moment().format('YYYY-MM-DD');
            this.sendSocketNotification('PICKUP_DATES', { 'wasteType error': "address not found" });
        }
    },

    // Create the URL for fetching pickup dates
    async createPickupDatesUrl(address) {
        const url = `https://api.dataforsyningen.dk/adresser?fuzzy=true&kommunekode=751&per_side=30&q=${address.replace(' ', '+')}`;
        const jsonData = await this.fetchJsonFromUrl(url);

        if (jsonData && jsonData.length > 0) {
            this.fetchPickupDates(jsonData[0].kvhx);
        } else {
            Log.error(`${this.name}: No kvhx found for configured address`);
        }
    },

    // Handle incoming socket notifications
    socketNotificationReceived: function(notification, payload) {
        if (notification === "GET_PICKUP_DATES") {
            this.createPickupDatesUrl(payload);
        }
    }
});