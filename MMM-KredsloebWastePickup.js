Module.register("MMM-KredsloebWastePickup", {
    defaults: {
		address: "",
		dateFormat: "dddd Do MMM",
		useHumanFormat: "by_week", // Accepts "strict" and "by_week"
		showHeader: true,
		updateSpeed: 1000,
		refresh: 3600,
		displayIcons: true,
		displayWasteType: false,
		exclusions: [""],
    },

    getScripts: function() {
        return [ "moment.js" ];
	},

	getStyles: function () {
		return [this.file("style.css")];
	  },
	
    getTranslations: function() {
        return {
			da: "translations/da.json",
            en: "translations/en.json"
        };
    },

    start: function() {
		var self = this;
		moment.locale(config.language);

        this.journeys = [];
        this.getPickupDates();
        setInterval( function(){
            self.getPickupDates();
        }, this.config.refresh*1000);
	},
	
	getPickupDates: function() {
		Log.info(`Fetching pickup dates for ${this.config.address}`);
		this.sendSocketNotification("GET_PICKUP_DATES", this.config.address);
	},

	getIcon: function(wasteType) {
		const wasteTypeNormalized = wasteType.toLowerCase().replace(/ /g, '-');
		let iconName;
	
		// mapping waste types to Font Awesome icons
		switch (wasteTypeNormalized) {
			case 'plastic':
				iconName = 'fa-recycle';
				break;
			case 'plast':
				iconName = 'fa-recycle';
				break;
			case 'glass':
				iconName = 'fa-recycle';
				break;
			case 'restaffald':
				iconName = 'fa-trash';
				break;
			case 'error':
				iconName = 'fa-exclamation-triangle'; // Error icon when wasteType is 'error'
				break;
			// Add more cases as necessary
			default:
				console.log(wasteTypeNormalized);
				iconName = 'fa-question'; // Default icon if no match is found
		}
	
		let icon = document.createElement("i");
		icon.className += `fa ${iconName} icon`;
		return icon;
	},
	

	getDateString: function(date) {
		const dateObj = moment(date);
		const currentDate = moment();
		const isToday = dateObj.isSame(currentDate, 'days');
		const isTomorrow = dateObj.diff(currentDate.startOf('day'), 'days') == 1;
		const isDayAfterTomorrow = dateObj.diff(currentDate.startOf('day'), 'days') == 2;
		if(isToday) {
			console.log(this.translate("test"));
			return this.translate("today");
		} else if(isTomorrow) {
			return this.translate("tomorrow");
		} else if(isDayAfterTomorrow) {
			return this.translate("dayaftertomorrow");
		} else if(this.config.useHumanFormat == "by_week") {
			const weeksUntil = dateObj.week() - currentDate.week();
			if(weeksUntil === 0) {
				return dateObj.format("dddd");
			} else if (weeksUntil === 1) {
				return this.translate("next_dow", {day: dateObj.format("dddd")});
			} else {
				return dateObj.format(this.config.dateFormat);
			}
		} else if(this.config.useHumanFormat == "strict") {
			let daysUntil = dateObj.diff(currentDate, "days");
			if(daysUntil < 7) {
				return dateObj.format("dddd");
			} else if (daysUntil < 13) {
				return this.translate("next_dow", {day: dateObj.format("dddd")});
			} else {
				return dateObj.format(this.config.dateFormat);
			}
		}
		return dateObj.format(this.config.dateFormat);
	},

    getCell: function(cellText, className) {
        let cell = document.createElement("td");
        if (!!className) {
            cell.className = className;
        }
        cell.innerHTML = cellText;
        return cell;
    },

    getDom: function(){
        let wrapper = document.createElement("div");
        wrapper.className = `light bright`;
        if (this.pickupDates && Object.keys(this.pickupDates).length > 0){
			let table = document.createElement("table");
            if (this.config.showHeader){
                let hrow = document.createElement("div");
                hrow.className = "light small align-right";
                hrow.innerHTML = this.translate('waste_pickup_header')
                wrapper.appendChild(hrow);
			}
			if(Object.keys(this.pickupDates).includes('error')) {
				let row = document.createElement("tr");
				row.appendChild(this.getCell(this.pickupDates.error));
				table.appendChild(row);
			} else {
				for (const [wasteType, pickupDate] of Object.entries(this.pickupDates)){
					let exclusions = this.config.exclusions.map( (excl) => { return excl.toLowerCase(); } );
					if (exclusions.includes(wasteType.toLowerCase())){
						continue;
					}
					let row = document.createElement("tr");
					row.className += "medium";
					if(this.config.displayIcons) {
						let cell = document.createElement("td");
						cell.appendChild(this.getIcon(wasteType))
						row.appendChild(cell);
					}
					if(this.config.displayWasteType) {
						row.appendChild(this.getCell(wasteType, "align-left small wasteType light"));
					}
					row.appendChild(this.getCell(this.getDateString(pickupDate), 'date'));
					table.appendChild(row);
				}
			}
            wrapper.appendChild(table);
        } else {
            wrapper.innerHTML = this.translate("LOADING");
        }
        return wrapper;
    },

    socketNotificationReceived: function(message, payload){
        if (message === "PICKUP_DATES"){
			this.pickupDates = payload;
            this.updateDom(this.config.updateSpeed);
        }
    }
});
