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
  let iconURL;
console.log(wasteType);
  // Handle the special case for "mad-ogdrikkekartoner"
  if (wasteTypeNormalized === 'mad--og-drikkekartoner') {
    iconURL = 'https://www.kredslob.dk/assets/waste-pictograms/mad-ogdrikkekartoner.svg';
  } else {
    iconURL = `https://www.kredslob.dk/assets/waste-pictograms/${wasteTypeNormalized}.svg`;
  }

  let icon = document.createElement("img");
  icon.src = iconURL;
  icon.className += ' icon';

  icon.onerror = function() {
    // If there is an error loading the SVG, display the "fa-question" icon and set width to 100%
    icon.src = ''; // Clear the previous source to prevent broken image icon
    icon.className = 'fa fa-question icon'; // Use Font Awesome "fa-question" icon
    icon.style.width = '100%'; // Set width to 100%
  };

  // Set the style to scale the SVG to 5%
  icon.style.width = '5%';

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
