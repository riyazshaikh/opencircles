Framework.Authentication = {
	getLogin: function(callback) {
		Framework.Services.get_login_details({
			callback: function(user) {
				if( user.result == 'none' ) {
					if( window.MyLikes ) {
						MyLikes.setupLikes();
					}
					if( callback ) {
						callback();
					}
					return;
				}
				Framework.User = Framework.Utils.get_formatted_users(user);
				if( window.MyLikes ) {
					MyLikes.setupLikes();
				}
				jQuery('.upper-signin').removeClass('upper-signin').addClass('upper-signout');
				jQuery('.upper-logged-in').html("Hi, <a>"+Framework.Utils.shorten(Framework.User.name,10)+"</a>").find('a').click(function() {
					Framework.Authentication.promptUpdate();
				});
				jQuery('.signin_prompt').css('display','none');
				if( callback ) {
					callback();
				}
			}
		});
	},

	isUserLoggedIn: function() {
		if( Framework.User.id )
			return true;
		else
			return false;
	},
	
	promptUpdate: function(data, options)
	{
		options = options || {};
		Framework.Analytics.trackAction('auth', 'update', 'prompt');
		data = data || {};
		jQuery('#auth_dialog').dialog("destroy").html("");
		jQuery('#auth_dialog').dialog({
			title: data.title || 'Account Info',
			width: Math.min(500, jQuery('.ui-body').width()*0.8),
			height: 600,
			buttons: {
				"Save": function(e) {
					e.stopPropagation();
					Framework.Analytics.trackAction('auth', 'update', 'save');
					var data = jQuery.editUI.getVals(jQuery('#auth_dialog'));
					if( !data.email ) { 
						alert("Email is invalid"); 
						return;
					}
					if( data['password'] != data['confirm-pass'] ) {
						alert("Passwords don't match");
						return;
					}

					var doUpdate = function() {
						data.latlong = Framework.Utils.geocode().latlong;
						Framework.Services.update_login(data, {
							callback: function(response) {
								Framework.Analytics.trackAction('auth', 'update', 'done');
								Framework.Authentication.getLogin();
								jQuery('#auth_dialog').dialog('close');
								if( options.callback ) {
									options.callback();
								}
							}
						});
					};
					if( data.user_loc == Framework.Utils.geocode().area ) {
						doUpdate();
					} else {
						Framework.Services.get_geocode_details( data.user_loc, {
							callback: function(geocode) {
								Framework.Utils.geocode(geocode);
								jQuery('#input_location').val(geocode.area);
								doUpdate();
							}
						});
					}
				}
			},
			close: function() {
				jQuery('#auth_dialog').dialog("destroy").html("");
			},
			open: function() {
				var btnInvite = jQuery('<a><span class="persons" style="display: inline-block"></span>Invite Friends</a>');
				btnInvite.click(Framework.InviteFriends);
				jQuery('.ui-dialog-buttonpane:visible').prepend(btnInvite);
				var editOps = [
					{
						key: 'email',
						type: 'email',
						label: 'Email',
						help: 'We promise not to reveal this to anyone',
						defaultValue: ''
					},
					{
						key: 'name',
						type: 'string',
						label: 'Name',
						help: 'Your identity on OpenCirclez',
						defaultValue: ''
					},
					{
						key: 'pic',
						type: 'uploader',
						label: 'Pic',
						target: '/img',
						defaultValue: ''
					},
					{
						key: 'activities',
						type: 'string',
						label: 'My Likes',
						help: 'Activities you like (separate with commas)',
						defaultValue: ''
					},
					{
						key: 'more-details',
						type: 'link',
						label: '+ more details',
						onClick: function() {
							jQuery.editUI.showOptional(jQuery('#auth_dialog'));
						}
					},
					{
						key: 'user_loc',
						type: 'string',
						label: 'Location',
						help: 'City, zipcode or address',
						optional: true,
						defaultValue: ''
					},
					{
						key: 'radius',
						type: 'dropdown',
						label: 'Distance (miles)',
						choices: [1,2,5,10,15,20,25],
						defaultValue: 15,
						optional: true,
						help: 'How far are you willing to travel?'
					},
					{
						key: 'url',
						type: 'string',
						label: 'Social profile',
						optional: true,
						help: 'Recommended to build trust',
						defaultValue: ''
					},
					{
						key: 'password',
						type: 'password',
						label: 'Password',
						optional: true,
						defaultValue: ''
					},
					{
						key: 'confirm-pass',
						type: 'password',
						label: 'Confirm',
						optional: true,
						defaultValue: ''
					}
				];		
				jQuery.editUI(jQuery('#auth_dialog'), editOps);		
				Framework.User.user_loc = Framework.Utils.geocode().area;
				Framework.User.activities = MyLikes.activities.join(',');
				jQuery.editUI.setVals(jQuery('#auth_dialog'), Framework.User);
			}
		});
	},
	
	promptLogin: function(options)
	{
		options = options || {};
		var fbLogin = function() {
			jQuery('#auth_dialog').dialog('close');
			Framework.Analytics.trackAction('auth', 'facebook', 'prompt');
			Framework.Facebook.loginCheck(function() {
				var data = Framework.Facebook.user;
				if( data ) {
					Framework.Analytics.trackAction('auth', 'facebook', 'login');
					data.latlong = Framework.Utils.geocode().latlong;
					data.activities = MyLikes.activities.join(',');
					data.referral = $.cookie('referral') || '';
					Framework.Services.login(data, {
						callback: function(response) {
							if( response.result == 'exists' ) {
								alert('Did you set a password?');
								Framework.Authentication.promptLogin(options);
							} else {
								Framework.Authentication.getLogin(options.callback);
							}
						}
					});
				} else {
					Framework.Analytics.trackAction('auth', 'facebook', 'cancel');
				}
			}, true);
		};
		Framework.Facebook.init();
		if( Framework.Utils.inFacebook() ) {
			fbLogin();
			return;
		}
		Framework.Analytics.trackAction('auth', 'login', 'prompt');
		jQuery('#auth_dialog').dialog("destroy").html("");
		jQuery('#auth_dialog').dialog({
			title: 'Just One More Step (Sign In)',
			width: Math.min(500, jQuery('.ui-body').width()*0.8),
			height: 340,
			buttons: {
				"Login": function(e) {
					e.stopPropagation();
					Framework.Analytics.trackAction('auth', 'login', 'save');
					var data = jQuery.editUI.getVals(jQuery('#auth_dialog'));
					if( !data.email ) { 
						alert("Email is invalid"); 
						return;
					}
					data.latlong = Framework.Utils.geocode().latlong;
					data.activities = MyLikes.activities.join(',');
					data.referral = $.cookie('referral') || '';
					var bDone = false;
					Framework.Services.login(data, {
						callback: function(response) {
							bDone =true;
							if( response.result == 'wrong' ){
								Framework.Analytics.trackAction('auth', 'login', 'wrong');
								alert('Wrong password');
							} 
							else {
								Framework.Analytics.trackAction('auth', 'login', 'done');
								Framework.Authentication.getLogin(function() {
									if( response['new'] ) {
										Framework.Authentication.promptUpdate({ title: 'Add More Details' }, options);
									} else {
										jQuery('#auth_dialog').dialog('close');
										if( options.callback )
										{
											options.callback();
										}
									}
								});
							}
						}
					});
					setTimeout(function() {
						if( !bDone ) {
							Framework.Services.send_message({
								to: 'admin@opencirclez.com',
								from: 'admin@opencirclez.com',
								message: $.toJSON(data),
								subject: 'Problem signing in'
							}, {
								callback: function() {
									alert('There was a problem signing up. A message has been sent to OpenCirclez support. Please try again tomorrow.');
								}
							});
						}
					}, 5000);
				}
			},
			close: function() {
				jQuery('#auth_dialog').dialog("destroy").html("");
			},
			open: function() {
				var btnFbLogin = jQuery('<a><span class="fb-login"></span>Login using Facebook</a>');
				btnFbLogin.click(fbLogin);
				jQuery('.ui-dialog-buttonpane:visible').prepend(btnFbLogin);
				jQuery.editUI(jQuery('#auth_dialog'),[
					{
						key: 'email',
						type: 'email',
						label: 'Email',
						defaultValue: ''
					},
					{
						key: 'password',
						type: 'password',
						label: 'Password',
						defaultValue: ''
					},
					{
						key: 'forgot-pass',
						type: 'link',
						label: 'Forgot password? Email it!',
						onClick: function() {
							Framework.Analytics.trackAction('auth', 'login', 'forgot');
							var data = jQuery.editUI.getVals(jQuery('#auth_dialog'));
							if( !data.email ) { 
								alert("Email is invalid");
								return;
							}
							Framework.Services.reset_password({ 
								email: data.email,
								latlong: Framework.Utils.geocode().latlong
							}, {
								callback: function() {
									alert("Password was sent to "+data.email);
								}
							});
						}
					}
				]);		
			}
		});
	}
};