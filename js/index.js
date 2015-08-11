var init_system = function() {
	if( jQuery('body').width() > 760 ) {
		jQuery('.oc-tagline, #my-likes').css('left', '45%');
	}
	if( Framework.Utils.inFacebook() ) {
		Framework.Facebook.loginCheck(function() {
			var data = Framework.Facebook.user;
			if( data ) {
				data.latlong = Framework.Utils.geocode().latlong;
				Framework.Services.join(data, {
					callback: function(response) {
						Framework.Authentication.getLogin(function() {
							handleCallsToAction();
						});
					}
				});
			}
		});
	}
	
	jQuery('#footer a').click(function(e) {
		e.stopPropagation();
		var href = jQuery(this).attr('href');
		Framework.Analytics.trackAction('footer', href);
		if( href == '/' )
		{
			window.location.href = Framework.SITE_URL;
			return;
		}
		else if( href && href.indexOf('#') === 0 )
		{
			var path = href.substring(1);
			jQuery.get(path, function(data) {
				jQuery('#main-content, #search-box, #local-users').hide();
				jQuery('#secondary-content').hide().html(data).show('slow');
			});
		}
	});
	jQuery('.upper-about').click(function() {
		jQuery('#footer a[href*=aboutus]').click();
	});
	// jQuery('#header').click(function() { window.location.href = Framework.SITE_URL; });

	var updateSuggestions = function(suggestions) {
		jQuery('#activity_suggest').hide("slide", { direction: "left"}, function() {
			jQuery(this).html("");
			for( var i=0; i<suggestions.length; i++ )
			{
				jQuery('#activity_suggest').append('<a>'+Framework.Utils.capitaliseFirstLetter(suggestions[i])+'</a>');
			}
			jQuery(this).show('slide', { direction: 'right'});
			setTimeout(function() {
				updateSuggestions(Framework.Utils.shuffle(Framework.Constants.SUGGESTIONS).slice(0,5));
			}, 5000);
		});
	}
	updateSuggestions(Framework.Constants.TAGLINES.suggestions.split(','));
	
	var geocode = $.cookie('geocode');
	var useGeocode = function(geocode) {
		jQuery('#input_location').val(geocode.area);
		jQuery('.call-to-action .location').html(Framework.Utils.geocode().area).click(function() {
			moreClick(true);
		});
	};
	
	if( geocode )
	{
		geocode = $.evalJSON(geocode);
		Framework.Services.defaultGeocode = geocode;
		useGeocode(geocode);
	}
	else
	{
		Framework.Services.get_geocode({ 
			callback: function(resp) {
				Framework.Utils.geocode(resp);
				useGeocode(resp);
			} 
		});
	}
	if( window.navigator.geolocation ) {
		Framework.Utils.geolocate(function(geocode) {
			jQuery('#input_location, .calltoaction .location').val(geocode.area);
		});
	}
	
	jQuery('#input_activity').val("What are you doing today?").focus(function() {
		if( jQuery(this).val().indexOf("What") > -1 ) {
			jQuery(this).val("");
		}
		moreClick(true);
	}).blur(function() {
		if( jQuery(this).val() == "" ) {
			jQuery(this).val("What are you doing today?");
		}
	});
}

jQuery.editUI(jQuery('#loc_date_holder'),[
	{
		key: 'location',
		type: 'string',
		label: 'Near ',
		defaultValue: Framework.Utils.parseUrl().param('location') || '',
		help: 'City, zipcode or address'
	},
	{
		key: 'date',
		type: 'date',
		label: 'On',
		defaultValue: new Date().toString('yyyy-MM-dd')
	}
]);

var timeBegin = 0, timeEnd = 24;
jQuery.editUI(jQuery('#time_holder'),[
	{
		key: 'time',
		type: 'slider',
		min: timeBegin,
		max: timeEnd,
		label: 'from',
		defaultValues: [timeBegin, timeEnd],
		onChange: function(values)
		{
			timeBegin = values[0];
			timeEnd = values[1];
			var toReturn = values.slice();
			toReturn[0] = toReturn[0] < 12 ? toReturn[0] + 'am' : (toReturn[0]-12) + 'pm';
			toReturn[1] = toReturn[1] < 12 ? toReturn[1] + 'am' : (toReturn[1]-12) + 'pm';
			toReturn[0] = toReturn[0] == '0am' ? '12am' : (toReturn[0] == '12pm'? '...' : toReturn[0]);
			toReturn[1] = toReturn[1] == '0pm' ? '12pm' : (toReturn[1] == '12pm'? '...' : toReturn[1]);
			return toReturn[0] + ' - ' + toReturn[1];
		}
	}
]);

var radiusFactor = 5;
jQuery.editUI(jQuery('#radius_holder'),[
	{
		key: 'radius',
		type: 'slider',
		range: 'min',
		min: 1,
		max: 20,
		label: 'within',
		defaultValue: radiusFactor,
		help: '<a class="geolocate-btn" id="geolocate" style="display: inline;"></a>',
		onChange: function(value)
		{
			radiusFactor = value;
			return value + ' miles';
		}
	}
]);

var handleCallsToAction = function() {
	jQuery('.call-to-action, #local-users').hide();
	if( Framework.Authentication.isUserLoggedIn() ) {
		jQuery('.call-to-action.start-circle').show();
	} 
	if( Framework.Utils.parseUrl().param('activity') || Framework.Utils.parseUrl().param('eventid') ) {
		findResults(Framework.Utils.parseUrl().getAllParams());
	} else if( !Framework.Authentication.isUserLoggedIn() ) {
		showDummyActivities();
	}
};

var moreClick = function(bEnable) {
	if( !bEnable && jQuery('.ui-optional').is(':visible') )
	{
		// jQuery(this).html('More Options &gt;&gt;');
		jQuery('.ui-optional').slideUp(1000);
	}
	else if( bEnable && !jQuery('.ui-optional').is(':visible') )
	{
		// jQuery(this).html('Less Options &lt;&lt;');
		jQuery('.ui-optional').show('slide', {direction: 'up' }, 1000);
	}
};

var messagesShown = {};
var show_user_message = function(eventid, user, message) {
	if( messagesShown[eventid] && messagesShown[eventid].userid == user.uid && messagesShown[eventid].message == message )
	{
		return;
	}
	
	messagesShown[eventid] = { userid: user.uid, message: message };
	var content_container = jQuery('.list_item[eventid="'+eventid+'"]');
	var header_container = jQuery('h3[eventid="'+eventid+'"]');
	if( !header_container.find('.persons').hasClass('show') )
	{
		header_container.find('.persons').addClass('show');
	}
	user = Framework.Utils.get_formatted_users(user);
	var newMessage = jQuery(Framework.Utils.tmpl(Framework.Constants.TEMPLATES.message, { user: user, message: message } ));
	content_container.find('.user_comments').append('<br/>').append(newMessage);
	newMessage.find('a').attr('title', 'Likes: '+user.activities.join(','));
};

var addAccordion = function(activs, bFade) {
	var activityGroup = jQuery('<div class="activity_group"></div>');
	if( bFade )
	{
		activityGroup.hide();
	}
	activityGroup.appendTo('#list_activities').html(Framework.Utils.tmpl(Framework.Constants.TEMPLATES.listing,{results: activs})).accordion({ 
		active: false, 
		collapsible: true, 
		autoHeight: false,
		clearStyle: true,
		change: function(event, ui) {
			var newActivity = Framework.ActivityStore.get_activity_by_id(ui.newContent.attr('eventid'));
			if( newActivity && newActivity.hasmsg && newActivity.owner && ui.newContent.find('.user_comments').children().length == 0 )
			{
				Framework.Services.get_messages(newActivity.id, {
					callback: function(msgs) {
						for( var jM = 0; jM<msgs.length; jM++ )
						{
							jQuery.extend(msgs[jM].user, msgs[jM].user.data);
							show_user_message(newActivity.id, msgs[jM].user, msgs[jM].message);
						}
					}
				});
			}
		}
	});		
	activityGroup.find('.ask-friends, .join-group, .discover-new').addClass("ui-button ui-corner-all ui-priority-primary floater-left");
	activityGroup.find('.ui-accordion-header').click(function(e) {
		e.stopPropagation();
		Framework.Analytics.trackAction('search', 'activity-click');
	});
	if( bFade )
		activityGroup.fadeIn('slow');
};

var lazyTimer;
var showResults = function() {
	if( jQuery('.activity_group').length && Framework.ActivityStore.current.length == 0 )
	{
		stopLoading();
		return;
	}
	else if( Framework.ActivityStore.current.length == 0 )
	{
		return;
	}
	if( Framework.ActivityStore.cache.length > 1 )
	{
		$('#edit_prompt').html('Found '+Framework.ActivityStore.cache.length+' activities within '+radiusFactor+' miles of '+Framework.Utils.shorten(Framework.Utils.geocode().area, 15));
	}
	if( jQuery('#list_activities').is(':visible') == false )
	{
		jQuery('#list_activities').show();
	}
	if( jQuery('#sortby').is(':visible') == false )
	{
		jQuery('#sortby').show();
	}
	
	if( jQuery('#sortby select').val() == 'time' )
	{
		var lastEvent = Framework.ActivityStore.get_activity_by_id(jQuery('.list_item:last').attr('eventid'));
		if( !lastEvent || Framework.Utils.get_time_12am(lastEvent.starttime) != Framework.Utils.get_time_12am(Framework.ActivityStore.current[0].starttime) )
		{
			jQuery('#list_activities').append('<h3 class="sort-limiter">'+(new Date(Framework.ActivityStore.current[0].starttime)).toString('dddd, MMMM d')+'</h3>');
		}
	}
	else if( jQuery('#sortby select').val() == 'source' )
	{
		var lastEvent = Framework.ActivityStore.get_activity_by_id(jQuery('.list_item:last').attr('eventid'));
		if( !lastEvent || lastEvent.source != Framework.ActivityStore.current[0].source )
		{
			jQuery('#list_activities').append('<h3 class="sort-limiter">'+Framework.ActivityStore.current[0].source+'</h3>');
		}
	}
	addAccordion(Framework.ActivityStore.current.splice(0,1), true);
	
	if( Framework.ActivityStore.cache.length == 1 && Framework.Utils.parseUrl().param('eventid') )
	{
		jQuery('.activity_group').accordion('activate', 0);
		var newActivity = Framework.ActivityStore.cache[0];
		if( newActivity && newActivity.hasmsg && jQuery('.list_item[eventid="'+newActivity.id+'"]').find('.user_comments').children().length == 0 )
		{
			Framework.Services.get_messages(newActivity.id, {
				callback: function(msgs) {
					for( var jM = 0; jM<msgs.length; jM++ )
					{
						jQuery.extend(msgs[jM].user, msgs[jM].user.data);
						show_user_message(newActivity.id, msgs[jM].user, msgs[jM].message);
					}
				}
			});
		}
	}	
	
	/*
	var aStr = "";
	var cntr = 5;
	for(var i=1; i<20; i++)
	{
		for( var name in Framework.ActivityStore.keywords )
		{
			if( Framework.ActivityStore.keywords[name] == i )
			{
				aStr += '<a>'+Framework.Utils.capitaliseFirstLetter(jQuery.trim(name))+',</a>';
				cntr--;
			}
			if( cntr == 0 )
				break;
		}
	}
	if( jQuery('#activity_suggest').html() != aStr )
	{
		jQuery('#activity_suggest').html(aStr);
	}*/
};

var addTimer;
var findResults = function(filters) {
	filters = filters || {};
	filters.radius = filters.radius || radiusFactor;
	if( filters.eventid )
		filters.source = 'eventid';
	$('.activity_group, .sort-limiter').remove();
	$('#list_activities, #sortby, #local-users, .call-to-action.nousers').hide();
	$('#edit_prompt').html("");
	messagesShown = {};
	jQuery('#activity_loader').show();
	var showPrompt = function() {
		clearTimeout(addTimer);
		if( Framework.ActivityStore.cache.length == 0 ) 
		{
			jQuery('#activity_loader').hide();
			if( Framework.Authentication.isUserLoggedIn() ) {
				showEditableActivity({ name: filters.activity });
			} else {
				showDummyActivities();
			}
			Framework.Analytics.trackEvent('search','no-results',filters.source);
		} else {
			Framework.Analytics.trackEvent('search','yes-results',filters.source);
		}
	};
	clearTimeout(addTimer);
	addTimer = setTimeout(showPrompt, 15000);
	Framework.ActivityStore.fetchResults({ 
		source: filters.source,
		filters: filters,
		callback: showPrompt
	});
	clearInterval(lazyTimer);
	lazyTimer = setInterval(showResults, 2000);
};

var showEditableActivity = function(data) {
	data = data || {};
	data.name = data.name || 'Lets meet';
	data.description = data.description || '';
	data.address = data.address || '';
	data.url = data.url || '';
	data.cost = data.cost || '';
	data.pic = Framework.Authentication.isUserLoggedIn() ? Framework.User.pic : '/images/anonymous.jpg';
	data.owner = Framework.User.id || '';
	data.time = data.time || Framework.Utils.get_time_12am();
	data.distance = '0';
	
	jQuery('#list_activities').html("").show();
	jQuery('#edit_prompt').html("Starting A Circle...");
	var displayData = jQuery.extend({}, data);
	for( var name in displayData ) {
		if( !displayData[name] ) {
			displayData[name] = "<a class='editme'>Add "+name+"</a>";
		}
	}
	addAccordion([displayData]);	
	jQuery('.activity_group').accordion('activate', 0);
	jQuery('.discover-new, .grow-circle').hide();
	jQuery('.activity_group .editme').click(function() {
		showEditActivity(data);
	});
	Framework.ActivityStore.cache = [data];
};

var showEditActivity = function(data) {
	data = data || {};
	data.title = data.title || data.name;
	Framework.Analytics.trackAction('action', 'edit-activity', 'prompt');
	jQuery('#post_message').dialog("destroy").html("");
	jQuery('#post_message').dialog({
		title: 'Edit The Activity Circle',
		width: 575,
		height: 600,
		open: function() {
			jQuery.editUI(jQuery('#post_message'),[
			{
				key: 'title',
				type: 'string',
				label: 'Happening',
				help: 'Name of activity/event',
				defaultValue: ''
			},
			{
				key: 'description',
				type: 'textarea',
				label: 'Details',
				defaultValue: ''
			},
			{
				key: 'cost',
				type: 'string',
				label: 'Cost',
				defaultValue: ''
			},
			{
				key: 'tags',
				type: 'string',
				label: 'Tags',
				help: 'Useful to target particular interests',
				defaultValue: ''
			},
			{
				key: 'url',
				type: 'string',
				label: 'Url to details',
				defaultValue: ''
			},
			{
				key: 'address',
				type: 'string',
				label: 'Location',
				help: 'City, zipcode or address',
				defaultValue: ''
			},
			{
				key: 'timeless',
				type: 'checkbox',
				label: 'Timeless',
				defaultValue: '1',
				help: 'Uncheck to make this a one-time event',
				onClick: function() {
					jQuery('#post_message .ui-optional').toggle();
				}
			},
			{
				key: 'datetime',
				type: 'date',
				label: 'Date',
				help: 'Suggest a day you prefer',
				defaultValue: new Date().toString('yyyy-MM-dd'),
				optional: true
			},
			{
				key: 'starttime',
				type: 'dropdown',
				label: 'Time',
				defaultValue: '12am',
				optional: true,
				choices: ['12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM', 
							'12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM']
			}
		]);
		data.address = data.address || Framework.Utils.geocode().area;
		jQuery.editUI.setVals(jQuery('#post_message'), data);
		if( typeof(data.timeless) != 'undefined' && data.timeless != 1 ) {
			jQuery('#post_message .ui-optional').show();
		}
	},
	buttons: {
		"Save": function() {
			Framework.Analytics.trackAction('action', 'edit-activity', 'ok');
			var activity = data;
			jQuery.extend(activity, jQuery.editUI.getVals(jQuery('#post_message')));
			activity.description = activity.description.replace(/\n/gim,"<br/>");
			activity.starttime = Date.parseExact(activity.datetime + ' ' + activity.starttime, 'yyyy-MM-dd h tt').getTime();
			
			if( !activity.title ) {
				alert('Enter an activity');
				return;
			}
			jQuery('#post_message').dialog('destroy');											
			Framework.Actions.add_activity(activity, {
				bForceLogin: true,
				callback: function(activity) {
					var newurl = Framework.SITE_URL + '#eventid='+activity.id;
					if( window.location.href == newurl ) {
						findResults({ eventid: activity.id });
					} else {
						window.location.href = newurl;
					}
				}
			});
		}
	}
	});
};

var searchClick = function(source) {
	source = typeof(source) != 'string' ? 'onclick' : source; // to differentiate pure searches vs. triggered ones
	
	if( !jQuery('#main-content').is(':visible') )
	{
		jQuery('#secondary-content').hide();
		jQuery('#main-content').show();
	}
	moreClick(false);
	jQuery('#sortby select').val('coolness');
	var filters = {};
	filters.activity = jQuery.trim(jQuery('#input_activity').val());
	filters.activity = filters.activity.indexOf("What") > -1 ? "" : filters.activity;
	filters.time = Date.parseExact(jQuery('#input_date').val(), 'yyyy-MM-dd').getTime();
	filters.time = (filters.time + timeBegin*3600000) + ',' + (timeEnd < 24 ? (filters.time + timeEnd*3600000): '');
	filters.radius = radiusFactor;
	filters.source = source;
	
	MyLikes.addLike(filters.activity);
	if( jQuery('#input_location').val() != Framework.Utils.geocode().area )
	{
		Framework.Services.get_geocode_details(jQuery('#input_location').val(), {
			callback: function(resp) {
				Framework.Utils.geocode(resp);
				jQuery('.location').html(resp.area);
				bSkipChange = true;
				window.location.hash = '#activity='+filters.activity;
				findResults(filters);
			}
		});
	}
	else
	{
		bSkipChange = true;
		window.location.hash = '#activity='+filters.activity;
		findResults(filters);
	}
	return false;
};

var stopLoading = function() {
	jQuery('#activity_loader').hide();
	clearInterval(lazyTimer);
};

var showDummyActivities = function() {
	jQuery('#local-users').html("");
	var users = [];
	users.push({
		id: 0, name: '', pic: Framework.SITE_URL + 'images/1.jpg', last_login: (new Date()).addHours(-1), activities: "Am hosting a party tonight. Let me know if you want in."
	});
	users.push({
		id: 0, name: '', pic: Framework.SITE_URL + 'images/2.png', last_login: (new Date()).addHours(-10), activities: "Looking for people to play soccer"
	});
	users.push({
		id: 0, name: '', pic: Framework.SITE_URL + 'images/3.jpg', last_login: (new Date()).addHours(-20), activities: "Anyone plays music around here? Would be cool to start a band."
	});
	users.push({
		id: 0, name: '', pic: Framework.SITE_URL + 'images/4.jpg', last_login: (new Date()).addHours(-30), activities: "Lets meet for a prayer circle"
	});
	users.push({
		id: 0, name: '', pic: Framework.SITE_URL + 'images/5.png', last_login: (new Date()).addHours(-40), activities: "Any poker players in the neighborhood?"
	});
	
	for( var i=0; i<users.length; i++ )
	{
		jQuery('#local-users').append(Framework.Utils.tmpl(Framework.Constants.TEMPLATES.users, { user: users[i] }));
	}
	jQuery('#local-users').css('opacity', 0.4).show();
	jQuery('.call-to-action.nousers').show();
};

var showUsersAround = function(activity, radius) {
	return;
	activity = activity || '';
	if( !$.cookie('geocode') && !Framework.Utils.geocode_stored ) {
		setTimeout(function() { showUsersAround(); }, 100);
		return;
	}

	if( !activity && !Framework.Authentication.isUserLoggedIn() ) {
		jQuery('.call-to-action').hide();
		jQuery('#local-users').html("");
		var users = [];
		while( users.length < 5 ) {
			var userObj = { id: 0, name: 'Anonymous', pic: 'http://www.opencirclez.com/images/anonymous.jpg' };
			userObj.last_login = (new Date()).addHours(-users.length*users.length);
			userObj.activities = Framework.Utils.shuffle(Framework.Constants.SUGGESTIONS).slice(0,5);
			userObj.about_me = Framework.Utils.shuffle(["Hi, I'm new in town. Anyone want to hang out?", "Looking for people to play soccer", "Lets meet for a prayer circle", "Anything interesting happening in the city? Hit me up.", "Just moved here a couple of months ago. Looking for friends to hang out with", "Anyone plays music around here? Would be cool to start a band."])[0];
			users.push(userObj);
		}
		for( var i=0; i<users.length; i++ )
		{
			jQuery('#local-users').append(Framework.Utils.tmpl(Framework.Constants.TEMPLATES.users, { user: users[i] }));
		}
		jQuery('#local-users').css('opacity', 0.4);
		jQuery('.nousers').show();
		return;
	}
	
	var params = {};
	params.latlong = Framework.Utils.geocode().latlong;
	params.activity = Framework.Utils.parseUrl().param('activity') || "";
	params.status = 1;
	params.radius = radius || 20;
	Framework.Services.get_users( params, {
		callback: function(gotUsers) {
			var users = Framework.Utils.get_formatted_users(gotUsers.slice());
			jQuery('.call-to-action').hide();
			jQuery('#local-users').html("").css('opacity', 1);
			if(users.length) {
				for( var i=0; i<users.length; i++ )
				{
					jQuery('#local-users').append(Framework.Utils.tmpl(Framework.Constants.TEMPLATES.users, { user: users[i] }));
				}
				jQuery('.start-circle').show();
			} else if( Framework.Utils.inFacebook() ) {
				jQuery('.nobody-around').show();
				Framework.Facebook.get_friends(function(friends) {
					var cnt = 0;
					for( var i=0; i<friends.length; i++ )
					{
						if( !friends[i].activities ) {
							continue;
						}
						var user = {
							url: "http://www.facebook.com/profile.php?id="+friends[i].uid,
							pic: friends[i].pic_square,
							last_login: (new Date).getTime(),
							about_me: '',
							activities: []
						};
						jQuery('#local-users').append(Framework.Utils.tmpl(Framework.Constants.TEMPLATES.users, { user: user }));
						cnt++;
						if( cnt == 5 ) {
							break;
						}
					}
				});
			} else {
				jQuery('.nobody-around').show();
			}
		}
	});
};

var MyLikes = {
	activities: [],
	
	addLike: function(activity) {
		if( !activity || Framework.Utils.inArray(activity.toLowerCase(), MyLikes.activities) ) {
			return;
		}
		if( jQuery('.oc-tagline').is(':visible') ) {
			jQuery('.oc-tagline').hide();
			jQuery('#my-likes').show();
		}
		MyLikes.activities.push(activity.toLowerCase());
		if( !Framework.Authentication.isUserLoggedIn() ) {
			$.cookie('activities', $.toJSON(MyLikes.activities));
		}
		MyLikes.showLike(activity);
	},
	
	showLike: function(activity) {
		var newLike = jQuery('<div class="activity ui-widget-content ui-corner-all">'+activity+'<a class="ui-icon ui-icon-close"></a></div>').hide();
		jQuery('#my-likes').append(newLike);
		newLike.fadeIn('slow').click(function() {
			jQuery('#input_activity').val(jQuery(this).text()).focus();
			searchClick();
		}).find('a').click(function(e) {
			e.stopPropagation();
			var activityCont = jQuery(this).parent();
			for(var i=0; i<MyLikes.activities.length; i++)
			{
				if( MyLikes.activities[i] == activityCont.text() )
				{
					MyLikes.activities.splice(i,1);
					break;
				}
			}
			activityCont.hide('slow', function() { activityCont.remove(); });
			if( Framework.Authentication.isUserLoggedIn() ) {
				Framework.Services.update_login({activities : MyLikes.activities.join(',')});
			} else {
				$.cookie('activities', $.toJSON(MyLikes.activities));
			}
		});
	},
	
	setupLikes: function() {
		if( Framework.Authentication.isUserLoggedIn() ) {
			MyLikes.activities = Framework.User.activities;
		} else if($.cookie('activities')) {
			MyLikes.activities = $.evalJSON($.cookie('activities'));
		}
		if( MyLikes.activities.length ) {
			jQuery('.oc-tagline').hide();
			jQuery('#my-likes').show().find('.activity').remove(); // start from scratch
		}
		for( var i=0; i<MyLikes.activities.length; i++ )
		{
			MyLikes.showLike(MyLikes.activities[i]);
		}
	}
};

jQuery('.upper-signin, .upper-signout').live('click', function(e) {
	e.stopPropagation();
	if( Framework.Authentication.isUserLoggedIn() )
	{
		Framework.Analytics.trackAction('auth', 'logout');
		Framework.Services.logout({
			callback: function() {
				Framework.User = {};
				jQuery('.upper-signout').removeClass('upper-signout').addClass('upper-signin');
				jQuery('.upper-logged-in').html("");
			}
		});
	}
	else
	{
		Framework.Authentication.promptLogin({ 
			callback: function() {
				handleCallsToAction();
			}
		});
	}
});
jQuery('.nousers input').click(function(e) { 
	e.stopPropagation();
	Framework.Analytics.trackAction('join', 'nousers');
	Framework.Authentication.promptLogin({ 
		callback: function() {
			handleCallsToAction();
		}
	}, true);
});

jQuery('.start-circle input, .start-own-btn').click(function(e) {
	e.stopPropagation();
	Framework.Analytics.trackAction('action', 'start-circle', 'user-list');
	showEditActivity();
});

jQuery('#btn_find').click(searchClick);

jQuery('#stop_loading').click(stopLoading);

Framework.InviteFriends = function() {
	Framework.Analytics.trackAction('action', 'invite-friends', 'start');
	if( Framework.Utils.inFacebook() ) {
		Framework.Facebook.app_invite(function() {
			Framework.Facebook.post_stream('OpenCirclez - Share Happenings Across Circles. '+MyLikes.activities.join(','), Framework.SITE_URL);
		});
		return;
	}
	jQuery('#post_message, #auth_dialog').dialog("destroy").html("");
	jQuery('#post_message').dialog({
		title: 'Invite friends to find shared activities',
		width: 575,
		height: 550,
		open: function() {
			jQuery('.ui-dialog-buttonpane .ui-button').addClass('ui-priority-primary');
			var description = "Hey!\n\nI came across this webapp that lets you share social happenings with friends and neighbors. \n\nJoin in so we can discover activities and events in our neighborhood! \n\nhttp://www.opencirclez.com";
			jQuery.editUI(jQuery('#post_message'),[
				{
					key: 'subject',
					type: 'string',
					label: 'Subject',
					defaultValue: "Activity Friends"
				},
				{
					key: 'emailto',
					type: 'textarea',
					rows: 2,
					label: 'Email To',
					help: 'Separate email ids with commas'
				},
				{
					key: 'message',
					type: 'textarea',
					rows: 10,
					label: 'Message'
				}
			]);
			jQuery.editUI.setVals(jQuery('#post_message'), {message: description});
			jQuery('.ui-dialog-buttonpane:visible').prepend('<a id="share-button"></a>');
			addthis.button('#share-button', {}, {url: window.location.href, title: "Activity Friends", description: description});
		},
		buttons: {
			"Send": function() {
				Framework.Analytics.trackAction('action', 'invite-friends', 'ok');
				var inviteData = jQuery.editUI.getVals(jQuery('#post_message'));
				Framework.Actions.invite_people(inviteData, {
					bForceLogin: true,
					callback: function() {
						alert('Sent');
					}
				});
			},
			"Close": function() {
				jQuery('#post_message').dialog('destroy');								
			}
		}
	});
};

jQuery('.list_item .message-me').live('click', function(e) {
	e.stopPropagation();
	Framework.Analytics.trackAction('action', 'send-msg', 'start');
	var userid = jQuery(this).attr('userid');
	var activityId = jQuery(this).parents('.list_item').attr('eventid');
	jQuery('#post_message').html("<textarea rows='3' style='width:100%;'>Hi "+jQuery(this).siblings('.user_name').text()+", I'd like to join you for this event.</textarea>");
	jQuery('#post_message').dialog({
		title: 'Send personal message',
		width: 575,
		height: 250,
		open: function() {
			jQuery('.ui-dialog-buttonpane .ui-button').addClass('ui-priority-primary');
		},
		buttons: {
			"OK": function() {
				Framework.Analytics.trackAction('action', 'send-msg', 'ok');
				Framework.Actions.send_message({
					userid: userid,
					eventid: activityId,
					message: jQuery('#post_message textarea').val()
				}, {
					bForceLogin: true,
					callback: function() {
						jQuery('#post_message').dialog('destroy');								
					}
				});
			}
		}
	});
});

jQuery('.list_item .grow-circle').live('click', function(e) {
	e.stopPropagation();
	Framework.Analytics.trackAction('action', 'grow-circle', 'event');
	var activityId = jQuery(this).closest('.list_item').attr('eventid');
	var activity = Framework.ActivityStore.get_activity_by_id(activityId);

	jQuery('#post_message').dialog("destroy").html("");
	jQuery('#post_message').dialog({
		title: 'Invite people to the circle',
		width: 575,
		height: 550,
		open: function() {
			jQuery('.ui-dialog-buttonpane:visible').prepend('<a id="share-button"></a>');
			addthis.button('#share-button', {}, {url: Framework.ActivityStore.getLinkToActivity(activity.id), title: activity.title, description: activity.description});

			jQuery('.ui-dialog-buttonpane .ui-button').addClass('ui-priority-primary');
			jQuery.editUI(jQuery('#post_message'),[
				{
					key: 'message',
					type: 'textarea',
					rows: 3,
					label: 'Message',
					help: 'Include a personal message'
				},
				{
					key: 'calltoaction',
					type: 'textarea',
					rows: 2,
					label: 'Call To Action',
					help: 'Give an incentive to reply'
				},
				{
					key: 'emailto',
					type: 'textarea',
					rows: 2,
					label: 'Email To',
					help: 'Separate email ids with commas'
				},
				{
					key: 'radius',
					type: 'dropdown',
					label: 'Distance (miles)',
					help: 'Distance to send out info',
					choices: [1,2,5,10,15,20],
					defaultValue: 5
				}
			]);
			jQuery.editUI.setVals(jQuery('#post_message'), {
				message: 'Hey,\n\nWould you like to join us?',
				calltoaction: "If you are coming, just post a message at the link below. It helps us get an idea of how many people to expect."
			});
		},
		buttons: {
			"Send": function() {
				Framework.Analytics.trackAction('action', 'grow-circle', 'ok');
				jQuery.extend(activity, jQuery.editUI.getVals(jQuery('#post_message')));
				activity.subject = activity.name;
				Framework.Actions.invite_people(activity, {
					bForceLogin: true,
					bTemplatize: true,
					callback: function() {
						alert('Sent... Email Blast by distance coming soon!');
					}
				});
			},
			"Close": function() {
				jQuery('#post_message').dialog('destroy');								
			}
		}
	});
});


jQuery('.list_item .discover-new').live('click', function(e) {
	e.stopPropagation();
	var activityId = jQuery(this).closest('.list_item').attr('eventid');
	var activity = Framework.ActivityStore.get_activity_by_id(activityId);
	if( !activity.owner ) {
		Framework.Analytics.trackAction('join-group');
		window.open(activity.url);
	} else {
		Framework.Analytics.trackAction('action', 'add-msg', 'start');
		jQuery('#post_message').html("<textarea rows='3' style='width:100%;'>"+Framework.Constants.TAGLINES.msg_prompt+"</textarea>");
		jQuery('#post_message').dialog({
			title: 'Post message to let people know you are interested',
			width: 575,
			height: 250,
			open: function() {
				jQuery('.ui-dialog-buttonpane .ui-button').addClass('ui-priority-primary');
			},
			buttons: {
				"OK": function() {
					var theMsg = jQuery('#post_message textarea').val();
					Framework.Analytics.trackAction('action', 'add-msg', 'ok');
					Framework.Actions.add_message({
						eventid: activityId,
						message: theMsg
					}, {
						bForceLogin: true,
						callback: function() {
							jQuery('#post_message').dialog('destroy');								
						}						
					});
				}
			}
		});
	}
});
jQuery('#search-form').keyup(function(ev) {
	if( ev.keyCode == 13 )
	{
		jQuery('#btn_find').click();
	}
});

jQuery('#activity_suggest a').live('click', function(e) {
	e.stopPropagation();
	jQuery('#input_activity').val(jQuery(this).text()).focus();
	searchClick('suggestion');
});

jQuery('#edit_prompt').click(function() { moreClick(true); });

jQuery('.call-to-action input[type="button"]').button();

jQuery('.edit_event, .edit-circle').live('click', function(e) {
	e.stopPropagation();
	Framework.Analytics.trackAction('action', 'start-circle', 'edit');
	var eventid = jQuery(this).closest('.list_item').attr('eventid');
	showEditActivity(Framework.ActivityStore.get_activity_by_id(eventid));
});

if( window.navigator.geolocation )
{
	jQuery('#geolocate').css('display', 'block').click(function(e) {
		e.stopPropagation();
		Framework.Analytics.trackAction('geolocate');
		var bDone = false;
		Framework.Utils.geolocate(function(geocode) {
			bDone = true;
			jQuery('#input_location').val(geocode.area);
			jQuery('#geolocate').hide('slow');
			moreClick(true);
		});
		setTimeout(function() {
			if( !bDone ) {
				alert('Trouble geolocating. Try entering manually.');
			}
		}, 15000);
	});
}

jQuery('#sortby select').change(function() {
	switch(jQuery(this).val()) {
		case 'time':
			jQuery('.sort-limiter').remove();
			var activities = Framework.ActivityStore.cache.slice();
			activities.sort(function(a,b) {
				return a.starttime - b.starttime;
			});
			if( Framework.ActivityStore.current.length )
			{
				$('.activity_group').remove();
				Framework.ActivityStore.current = activities;	
			}
			else if( activities.length )
			{
				var dayTime = Framework.Utils.get_time_12am(new Date(activities[activities.length-1].starttime));
				for( var i=activities.length-1; i>=0; i-- )
				{
					var existingItem = jQuery('.list_item[eventid="'+activities[i].id+'"]');
					if( existingItem.length )
					{
						if( activities[i].starttime < dayTime )
						{
							jQuery('#list_activities').prepend('<h3 class="sort-limiter">'+(new Date(dayTime)).toString('dddd, MMMM d')+'</h3>');
							dayTime = Framework.Utils.get_time_12am(new Date(activities[i].starttime));
						}
						jQuery('#list_activities').prepend(existingItem.parent().detach());
					}
				}
				jQuery('#list_activities').prepend('<h3 class="sort-limiter">'+(new Date(dayTime)).toString('dddd, MMMM d')+'</h3>');
			}
			break;
		
		case 'coolness':
			jQuery('.sort-limiter').remove();
			var activities = Framework.ActivityStore.cache.slice();
			activities = Framework.ActivityStore.sort_by_coolness(activities);
			if( Framework.ActivityStore.current.length )
			{
				$('.activity_group').remove();
				Framework.ActivityStore.current = activities;	
			}
			else if( activities.length )
			{
				for( var i=activities.length-1; i>=0; i-- )
				{
					var existingItem = jQuery('.list_item[eventid="'+activities[i].id+'"]');
					if( existingItem.length )
					{
						jQuery('#list_activities').prepend(existingItem.parent().detach());
					}
				}
			}
			break;
		
		case 'source':
			jQuery('.sort-limiter').remove();
			var activities = Framework.ActivityStore.cache.slice();
			activities.sort(function(a,b) {
				return a.source < b.source ? -1 : (a.source > b.source ? 1 : 0);
			});
			if( Framework.ActivityStore.current.length )
			{
				$('.activity_group').remove();
				Framework.ActivityStore.current = activities;	
			}
			else if( activities.length )
			{
				var source = activities[activities.length-1].source;
				for( var i=activities.length-1; i>=0; i-- )
				{
					var existingItem = jQuery('.list_item[eventid="'+activities[i].id+'"]');
					if( existingItem.length )
					{
						if( activities[i].source != source )
						{
							jQuery('#list_activities').prepend('<h3 class="sort-limiter">'+source+'</h3>');
							source = activities[i].source;
						}
						jQuery('#list_activities').prepend(existingItem.parent().detach());
					}
				}
				jQuery('#list_activities').prepend('<h3 class="sort-limiter">'+source+'</h3>');
			}
			break;
		
	}
});

var bSkipChange = true;
jQuery(document).ready(function() {
	$.history.init(function(hash){
		if( bSkipChange )
		{
			bSkipChange = false;
			return;
		}
		if( jQuery('#secondary-content').is(':visible') ) {
			jQuery('#secondary-content').hide();
			jQuery('#main-content, #search-box, #local-users').show();
		}
		var filters = Framework.Utils.parseUrl().getAllParams();
		filters.source = 'history';
		findResults(filters);
    },{ unescape: "&=" });

	init_system();
	
	var parsedUrl = Framework.Utils.parseUrl();

	if( parsedUrl.param('invitee') || parsedUrl.param('inviter') ) {
		$.cookie('referral', parsedUrl.param('invitee') + ','+ parsedUrl.param('inviter') );
	}

	if( parsedUrl.param('page') )
	{
		jQuery('#footer a[href="#about/'+parsedUrl.param('page')+'.html"]').click();
	}
	else if( parsedUrl.param('activity') || parsedUrl.param('eventid') )
	{
		jQuery('#input_activity').val(parsedUrl.param('activity')).focus();
		Framework.Authentication.getLogin(handleCallsToAction);
	}
	else if( parsedUrl.param('signin') || parsedUrl.param('signout') )
	{
		var doAction = function() {
			if( !$.cookie('geocode') && !Framework.Utils.geocode_stored ) {
				setTimeout(doAction, 100);
				return;
			}
			var data = parsedUrl.getAllParams();
			data.latlong = Framework.Utils.geocode().latlong;
			Framework.Services.signinout_anonymously( data, {
				callback: function(response) {
					if( response.result == 'signedout' ) {
						alert('Your email has been unsubscribed. Sign in if you want to enable it again.');
					}
					else 
					{
						Framework.Authentication.getLogin(function() {
							if( Framework.Authentication.isUserLoggedIn() ) {
								Framework.Authentication.promptUpdate({ title: 'Add More Details' });
							}
							handleCallsToAction();
						});
					}
				}
			});
		};
		doAction();
	} else {
		Framework.Authentication.getLogin(function() {
			handleCallsToAction();
		});
	}
});