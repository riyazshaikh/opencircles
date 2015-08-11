Framework.Actions = {
	add_activity: function(obj, options) {
		options = options || {};

		if( options.bForceLogin && !Framework.Authentication.isUserLoggedIn() )
		{
			Framework.Authentication.promptLogin({
				callback: function() {
					Framework.Actions.add_activity(obj, options);
				}
			});
			return;
		}
		
		obj.owner = Framework.User.id;
		obj.pic = Framework.User.pic;
		Framework.Services.get_geocode_details( obj.address, {
			callback: function(geocode) {
				obj.latlong = geocode.latlong;
				Framework.Services.add_activity(obj, {
					callback: function(id) {
						obj.id = id;
						Framework.Analytics.trackAction('action', 'edit-activity', 'done');
						
						// window.location.href = Framework.SITE_URL + '#eventid='+id;
						if( options.callback )
						{
							options.callback(obj);
						}
					}
				});

			}
		});
	},
	
	// Uses obj=event, or obj={emailto, subject, message}
	invite_people: function(obj, options) {
		options = options || {};

		if( options.bForceLogin && !Framework.Authentication.isUserLoggedIn() )
		{
			Framework.Authentication.promptLogin({
				callback: function() {
					Framework.Actions.invite_people(obj, options);
				}
			});
			return;
		}
		obj.message = obj.message.replace(new RegExp("\n","gm"),"\n<br/>");

		if( obj.emailto ) {
			var invitees = obj.emailto.split(',');
			for( var i=0; i<invitees.length; i++ )
			{
				if( !invitees[i] ) {
					continue;
				}
				var subject = obj.subject || Framework.User.name + ' invites you to a circle - ' + obj.title;
				var content;
				if( options.bTemplatize ) {
					obj = Framework.ActivityStore.get_activity_padded(obj);
					obj.emailto = invitees[i];
					content = Framework.Utils.tmpl(Framework.Constants.TEMPLATES.email, obj); 
				} else {
					var siteUrl = 'http://www.opencirclez.com';
					content = obj.message.replace(new RegExp(siteUrl),'<a href="'+siteUrl+'#signin='+invitees[i]+'" target=_blank>'+siteUrl+'#signin='+invitees[i]+'</a>');
					content += "\n<br/>\n<br/>--\n<br/>"+Framework.User.name;
				}
				
				Framework.Services.send_message({
					from: Framework.User.id,
					fromName: obj.fromName || Framework.User.name,
					to: invitees[i],
					subject: subject,
					message: content
				});
			}
			Framework.Analytics.trackAction('action', 'invite-people', 'done');
		}
		if( options.callback ) {
			options.callback();
		}
	},

	add_message: function(obj, options) {
		options = options || {};

		obj.activity = obj.activity || Framework.ActivityStore.get_activity_by_id(obj.eventid);
		if( options.bForceLogin && !Framework.Authentication.isUserLoggedIn() )
		{
			Framework.Authentication.promptLogin({
				callback: function() {
					Framework.Actions.add_message(obj, options);
				}
			});
			return;
		}
		
		Framework.Services.add_message({
			eventid: obj.eventid,
			message: obj.message
		}, {
			callback: function() {
				Framework.Analytics.trackAction('action', 'add-msg','done');
				if( window.show_user_message ) // hacky hacky
				{
					show_user_message(obj.eventid, Framework.User, obj.message);
				}
				if( options.callback )
				{
					options.callback();
				}
			}
		});
	},
	
	send_message: function(obj, options) {
		options = options || {};

		obj.activity = obj.activity || Framework.ActivityStore.get_activity_by_id(obj.eventid);
		if( options.bForceLogin && !Framework.Authentication.isUserLoggedIn() )
		{
			Framework.Authentication.promptLogin({
				callback: function() {
					Framework.Actions.send_message(obj, options);
				}
			});
			return;
		}
	
		var msg = "<a href='"+Framework.User.url+"' target=_blank>\
					<img alt=\""+Framework.User.name+"\" title=\""+Framework.User.name+"\" src='"+Framework.User.pic+"'/>\
					</a> says : " + obj.message + "<br/><br/><a href='"+Framework.SITE_URL+"#eventid="+obj.eventid+"'>Click here to view event details</a>";
		Framework.Services.send_message({
			to: obj.userid,
			from: Framework.User.id,
			message: msg,
			subject: Framework.User.name +' sent you a message about "'+obj.activity.name+'"'
		}, {
			callback: function() {
				Framework.Analytics.trackAction('action', 'send-msg', 'done');
				if( options.callback )
				{
					options.callback();
				}
			}
		});
	}
};