Framework.Services = {
	jsonpCallbacks: [],
	defaultGeocode: { area: "Manhattan", city: "New York", country: "USA", latlong: "40.7687736,-73.9542591", state: "NY", zipcode: "10021" },

	add_activity: function(data, options)
	{
		this._makeAjaxCall({ 	
				url: "/add", 
				data: data,
				type: 'post',
				success: function(response){
					options.callback(parseInt(response));
				}
		}, options);
	},
	
	logout: function(options)
	{
		this.makeJsonpCall( Framework.SERVICE_GAE + 'logout', options);
	},
	
	login: function(params, options)
	{
		this.makeJsonpCall( Framework.SERVICE_GAE + 'login?' + Framework.Utils.get_as_url_params(params), options);
	},
	
	join: function(params, options)
	{
		this.makeJsonpCall( Framework.SERVICE_GAE + 'join?' + Framework.Utils.get_as_url_params(params), options);
	},

	update_login: function(params, options)
	{
		this.makeJsonpCall( Framework.SERVICE_GAE + 'updatelogin?' + Framework.Utils.get_as_url_params(params), options);
	},
	
	reset_password: function(params, options)
	{
		this.makeJsonpCall( Framework.SERVICE_GAE + 'resetpass?' + Framework.Utils.get_as_url_params(params), options);
	},
	
	signinout_anonymously: function(params, options)
	{
		this.makeJsonpCall( Framework.SERVICE_GAE + 'anonysign?' + Framework.Utils.get_as_url_params(params), options);
	},
	
	get_login_details: function(options)
	{
		this.makeJsonpCall( Framework.SERVICE_GAE + 'getuser', options);
	},
	
	get_users: function(params, options)
	{
		this.makeJsonpCall( Framework.SERVICE_GAE + 'getusers?' + Framework.Utils.get_as_url_params(params), options);
	},
	
	get_event: function(filters, options)
	{
		this.makeJsonpCall( Framework.SERVICE_GAE + 'getevent?' + Framework.Utils.get_as_url_params(filters), options);
	},
	
	get_events: function(filters, options)
	{
		this.makeJsonpCall( Framework.SERVICE_GAE + 'search?' + Framework.Utils.get_as_url_params(filters), options);
	},
	
	send_message: function(obj, options)
	{
		options = options || {};
		this._makeAjaxCall({ 	
				url: "/sendmsg", 
				data: obj,
				type: 'post',
				success: function(response){
					if( options.callback ) {
						options.callback(response);
					}
				}
		}, options);
	},
	
	add_message: function(obj, options)
	{
		this.makeJsonpCall( Framework.SERVICE_GAE + 'addmsg?' + Framework.Utils.get_as_url_params(obj), options);
	},
	
	get_messages: function(eventid, options)
	{
		this.makeJsonpCall( Framework.SERVICE_GAE + 'getmsgs?eventid=' + eventid, options);
	},
	
	// Returns obj of City, CountryCode, CountryName, Latitude, Longitude, ZipPostalCode to options.callback
	get_geocode: function(options)
	{
		this.makeJsonpCall( Framework.SERVICE_URL + 'geolocation/geobytes', {
			callback: function(response) {
				var geocode = {};
				if(!response)
				{
					geocode = Framework.Services.defaultGeocode;
				}
				else
				{
					geocode.zipcode = "";
					geocode.area = response.region || response.city;
					geocode.city = response.city;
					geocode.state = response.regioncode;
					geocode.country = response.country;
					geocode.latlong = response.latitude + ',' + response.longitude;
					Framework.Services.defaultGeocode = geocode;
				}
				options.callback(geocode);
			}
		});
		/* var query = "SELECT * from ip.location where ip='"+ipaddr+"'";
		this.makeYqlCall(query, { 
			callback: function(response) { 
				if( response.query.results )
				{
					options.callback( response.query.results.Response);
				}
			} 
		}); */
	},
	
	// Returns Ip to options.callback
	get_ipaddress: function(options)
	{
		this.makeJsonpCall( 'http://jsonip.appspot.com/', {
			callback: function(response) {
				options.callback(response.ip);
			}
		});
	},

	get_geocode_details: function(addr, options)
	{
		if( !addr )
		{
			options.callback(this.defaultGeocode);
			return;
		}
		var callback = function(response) { 
			var geocode = {};
			geocode.zipcode = Framework.Utils.findProperty('PostalCodeNumber',response) || '';
			geocode.area = Framework.Utils.findProperty('formatted_address', response) || addr;
			/** yql bailed on me... need to find a more stable way to get these **/
			geocode.city = ''; 
			geocode.state = '';
			geocode.country = '';
			var point = Framework.Utils.findProperty('location', response);
			if( !point ) // latlong is mandatory
			{ // default geolocation
				Framework.Utils.error('no geocode details');
				geocode = Framework.Services.defaultGeocode;
			}
			else
			{
				geocode.latlong = point.lat + ',' + point.lng;
			}
			options.callback(geocode);
		}; 

		Framework.Services.makeJsonpCall(Framework.SERVICE_URL + 'proxy/getjson?path=' + encodeURIComponent("http://maps.googleapis.com/maps/api/geocode/json?sensor=false&address="+encodeURIComponent(addr)),
			{ callback: callback });

			/*var query = "SELECT * FROM google.geocoding WHERE q='"+addr+"'";
			this.makeYqlCall(query, { 
				callback: callback
			}) */			
	},

	get_file: function(path, options)
	{
		this._makeAjaxCall({ url: path, success: options.callback}, {} );
	},
	
	makeYqlCall: function(statement, options)
	{
		options.format = options.format || 'json';
		Framework.Services.makeJsonpCall("http://query.yahooapis.com/v1/public/yql?q="+encodeURIComponent(statement)+"&format="+options.format+"&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys", options);
	},
	
	makeJsonpCall: function(url, options)
	{
		options = options || {};
		var obj = {};
		obj.url = url;
		obj.dataType = 'jsonp';
		obj.jsonpCallback = "Framework.Services.jsonpCallbacks["+(this.jsonpCallbacks.length)+"]";
		
		var timeout;
		this.jsonpCallbacks.push(function(response) {
			clearTimeout(timeout);
			try {
				if( options.callback )
				{
					options.callback(response);
				}
			}
			catch(e) {
				Framework.Utils.error(e);
				if( options.onFailure )
				{
					options.onFailure();
				}
			}
		});
		timeout = setTimeout(function() {
			if( options.onFailure )
			{
				options.onFailure();
			}
		}, 5000);
		this._makeAjaxCall(obj, options);
	},

	
	_makeAjaxCall: function(obj, options)
	{
		obj.error = function(request,error) {
			Framework.Utils.error(error+','+obj.url+','+Framework.Utils.get_as_url_params(obj.data));
			if( options.onFailure )
			{
				options.onFailure();
			}
		};
		$.ajax(obj);
	}
	
};