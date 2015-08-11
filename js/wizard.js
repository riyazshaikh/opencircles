if( !$.cookie('geocode') )
{
	Framework.Services.get_geocode({ 
		callback: function(resp) {
			Framework.Utils.geocode(resp);
		} 
	});
} else {
	Framework.Services.defaultGeocode = $.evalJSON($.cookie('geocode'));
}

if( Framework.REALM == 'fb' ) {
	Framework.Facebook.loginCheck(function() {
		var data = Framework.Facebook.user;
		if( data ) {
			data.latlong = Framework.Utils.geocode().latlong;
			Framework.Services.join(data, {
				callback: function(response) {
					Framework.Authentication.getLogin(function() {
					});
				}
			});
		}
	});
	jQuery('head').append('<link type="text/css" rel="stylesheet" href="/css/fb_opencirclez.css" >');
}

jQuery.editUI(jQuery('#wiz-content-1'),[
	{
		key: 'title',
		type: 'string',
		label: 'Activity',
		help: 'Find a reason to get together',
		defaultValue: Framework.Utils.parseUrl().param('title') || 'Lets meet up '
	},
	{
		key: 'more-activity-details',
		type: 'link',
		label: '+ Add more details',
		onClick: function() {
			jQuery.editUI.showOptional(jQuery('#wiz-content-1'));
		}
	},
	{
		key: 'description',
		type: 'textarea',
		label: 'Description',
		optional: true,
		defaultValue: ''
	},
	{
		key: 'cost',
		type: 'string',
		label: 'Cost',
		optional: true,
		defaultValue: 'FREE'
	},
	{
		key: 'url',
		type: 'string',
		label: 'Url to details',
		optional: true,
		defaultValue: ''
	}
]);

jQuery.editUI(jQuery('#wiz-content-2'),[
	{
		key: 'address',
		type: 'string',
		label: 'Address',
		help: 'Be as specific as you want',
		defaultValue: Framework.Utils.geocode().area
	},
	{
		key: 'timeless',
		type: 'checkbox',
		label: 'Timeless',
		defaultValue: '1',
		help: 'Uncheck to make this a one-time event',
		onClick: function() {
			jQuery('#wiz-content-2 .ui-optional').toggle();
		}
	},
	{
		key: 'date',
		type: 'date',
		label: 'Date',
		help: 'Suggest a day you prefer',
		defaultValue: $.datepicker.formatDate( 'yy-mm-dd', new Date() ),
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
	
jQuery('.ui-more').css('text-align', 'left').css('padding-left','150px');

var showUsersAround = function(users) {
	for( var i=0; i<users.length; i++ )
	{
		if( users[i].id == Framework.User.id ) {
			continue;
		}
		var markup = '<div class="user-holder" userid="'+users[i].id+'" userindex="'+i+'"><a target=_blank href="'+users[i].url+'"><img src="'+users[i].pic+'"/><br/>'+users[i].name;
		markup += '</a><br/><a class="remove">Remove</a></div>';
		jQuery('#users-around').append(markup);
	}
	jQuery('#users-around .user-holder .remove').click(function() {
		jQuery(this).parent().fadeOut(function() { jQuery(this).remove(); });
	});
};

jQuery.editUI(jQuery('#msg-holder'),[
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
		rows: 4,
		label: 'Message',
		defaultValue: "Hey! \nI started this circle. Would you like to join in?"
	},
	{
		key: 'btn_invite',
		type: 'button',
		label: 'Send',
		onClick: function(e) {
			e.stopPropagation();
			Framework.Analytics.trackAction('action', 'invite-people', 'ok');
			var inviteData = jQuery.editUI.getVals(jQuery('#msg-holder'));
			theEvent.emailto = inviteData.emailto;
			jQuery('#users-around .user-holder').each(function() {
				theEvent.emailto += ',' + jQuery(this).attr('userid');
			});
			theEvent.message = inviteData.message;
			theEvent.fromName = 'OpenCirclez';
			Framework.Actions.invite_people(theEvent, { 
				callback: function() { 
					alert('Sent'); 
				},
				bTemplatize: true
			});
			/* Framework.Services.add_message({
				eventid: theEvent.id,
				message: theEvent.message
			}); */
		}
	}
]);
		
jQuery('#circle-grow').accordion({
			active: false, 
			collapsible: true, 
			autoHeight: false,
			clearStyle: true
});

jQuery('input#create').click(function(e) {
	e.stopPropagation();
	Framework.Analytics.trackAction('action', 'start-circle', 'create');
	var data = jQuery.editUI.getVals(jQuery('#wiz-content-1'));
	jQuery.extend(data, jQuery.editUI.getVals(jQuery('#wiz-content-2')));
	
	data.description = data.description.replace(/\n/gim,"<br/>");
	data.starttime = Date.parseExact(data.date + ' ' + data.starttime, 'yyyy-MM-dd h tt').getTime();

	if( eventId ) {
		data.id = eventId;
	}
	if( !Framework.Authentication.isUserLoggedIn() )
	{
		Framework.Authentication.promptLogin({
			callback: function() {
			}
		});
		setTimeout(function() { jQuery('#back').click(); }, 10);
		return;
	}
	
	data.pic = Framework.User.pic;
	Framework.Actions.add_activity(data ,{ 
		callback: function(event) {
			theEvent = event;
			
			if( !parsedUrl.param('eventid') ) {
				Framework.Services.add_message({
					eventid: theEvent.id,
					message: "Starting a circle for this"
				});
			}
			
			var url = Framework.SITE_URL + '#eventid='+event.id;
			jQuery('#wiz-content-3').prepend('Link to activity - <a href="'+url+'">'+url+'</a>');
		}
	});

	var params = {};
	params.latlong = Framework.Utils.geocode().latlong;
	params.activity = $.cookie("activity") || "";
	params.radius = $.cookie("radius") || 25;
	$.cookie("activity", null);
	$.cookie("radius", null);
	Framework.Services.get_users( params, {
		callback: function(users) {
			showUsersAround(users);
		}
	});
});

jQuery('input#done').click(function(e) {
	e.stopPropagation();
	Framework.Analytics.trackAction('action', 'start-circle', 'done');
	setTimeout(function() { window.location.href = Framework.SITE_URL + '#eventid='+theEvent.id; }, 100);
});

jQuery('.upper-signin, .upper-signout').live('click', function() {
	if( Framework.Authentication.isUserLoggedIn() )
	{
		Framework.Services.logout({
			callback: function() {
				Framework.User = {};
				jQuery('.upper-signout').removeClass('upper-signout').addClass('upper-signin');
			}
		});
	}
	else
	{
		Framework.Authentication.promptLogin();
	}
});

jQuery('#header').click(function() { window.location.href = Framework.SITE_URL; });

Framework.Services.get_login_details({
	callback: function(user) {
		Framework.User = Framework.Utils.get_formatted_users(user);
		if( Framework.Authentication.isUserLoggedIn() )
		{
			jQuery('.upper-signin').removeClass('upper-signin').addClass('upper-signout');
		}
	}
});

if( !Framework.Constants.TEMPLATES.email )
{
	Framework.Services.get_file('html/tmpl_email.html', { 
		callback: function(resp) { 
			Framework.Constants.TEMPLATES.email = resp; 
		} 
	});
}

var parsedUrl = Framework.Utils.parseUrl();
var selectedStep = 0;
var eventId = parsedUrl.param('eventid');
var theEvent = null;
$('#smartwizard').smartWizard({
	selectedStep: selectedStep
});

if( eventId )
{
	Framework.Services.get_event({ eventid: eventId }, {
		callback: function(event) {
			if( event.owner == Framework.User.id ) {
				theEvent = event;
				event.date = (new Date(event.starttime)).toString('yyyy-MM-dd');
				event.starttime = (new Date(event.starttime)).toString('h tt');
				jQuery.editUI.setVals(jQuery('#wiz-content-1'), event);
				jQuery.editUI.setVals(jQuery('#wiz-content-2'), event);
				if( !event.timeless ) {
					jQuery('#wiz-content-2 .ui-optional').show();
				}
			}
		}
	});
} else if( $.cookie('event_started') ) {
	theEvent = $.evalJSON($.cookie('event_started'));
	$.cookie('event_started', null);
	theEvent.date = (new Date(theEvent.time)).toString('yyyy-MM-dd');
	theEvent.starttime = (new Date(theEvent.time)).toString('h tt');
	jQuery.editUI.setVals(jQuery('#wiz-content-1'), theEvent);
	jQuery.editUI.setVals(jQuery('#wiz-content-2'), theEvent);
	if( !theEvent.timeless ) {
		jQuery('#wiz-content-2 .ui-optional').show();
	}
}
