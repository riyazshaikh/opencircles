  Framework.Facebook = {
	callbacks_afterlogin: [],
	initialized: false,
	user: null,
	friends: null,
	
	init: function(callback) {
		if( !Framework.Facebook.initialized ) {
			jQuery.getScript('http://connect.facebook.net/en_US/all.js', function() {
				var makeCall = function() {
					if( Framework.Facebook.initialized ) {
						if(callback) callback();
					} else {
						setTimeout(makeCall, 10);
					}
				};
				makeCall();
			});
		}
	},
	
	loginCheck: function(callback, bForce) {
		if( !Framework.Facebook.initialized ) {
			Framework.Facebook.init(function() {
				Framework.Facebook.loginCheck(callback, bForce);			
			});
			return;
		}
		if( Framework.Facebook.user )
		{
			callback();
		}
		else if( bForce )
		{
			FB.login(function(response) {
				Framework.Facebook.handleSessionResponse(response, callback);
			},{perms:'user_about_me,user_activities,user_interests,user_likes,email,friends_activities,friends_interests,publish_stream'});
		}
		else
		{
			FB.getLoginStatus(function(response) {
				Framework.Facebook.handleSessionResponse(response, callback);
			});
		}
	},
	
	logout: function() 
	{
		FB.logout(Framework.Facebook.handleSessionResponse);
	},
	
	get_friends: function(callback) 
	{
		Framework.Facebook.loginCheck(function() {
			if( Framework.Facebook.friends ) {
				callback(Framework.Facebook.friends);
			} else if( Framework.Facebook.user) {
				FB.api(
				  {
					method: 'fql.query',
					query: 'SELECT uid, name, pic_square, sex, activities, interests FROM user WHERE uid IN (SELECT uid2 FROM friend WHERE uid1 = me())'
				  },
				  function(response) {
					Framework.Facebook.friends = response;
					callback(Framework.Facebook.friends);
				});
			}
		});
	},

	app_invite: function(callback) 
	{
		Framework.Analytics.trackAction('invite', 'facebook-app', 'prompt');
		FB.ui({
			method: 'apprequests', 
			message: Framework.Facebook.user.name + ' wants to share activities & hobbies with you.', 
			filters: ['app_non_users'],
			data: 'from='+Framework.Facebook.user.name
		}, function(response) {
			if( response && response.request_ids ) {
				Framework.Analytics.trackAction('invite', 'facebook-app', 'sent');
			} else {
				Framework.Analytics.trackAction('invite', 'facebook-app', 'cancel');
			}
			if( callback ) callback();
		});
	},
	
	post_stream: function(msg, link, callback)
	{
		Framework.Analytics.trackAction('invite', 'facebook-stream', 'prompt');
		FB.ui({
			method: 'stream.publish',
			message: msg,
			action_links: [
				{ text: 'Join me', href: link }
			],
			user_message_prompt: 'Let your friends know about OpenCirclez'
		}, function(response) {
			if( response && response.post_id ) {
				Framework.Analytics.trackAction('invite', 'facebook-stream', 'sent');
			} else {
				Framework.Analytics.trackAction('invite', 'facebook-stream', 'cancel');
			}
			if( callback ) callback();
		});
	},
	
      // handle a session response from any of the auth related calls
    handleSessionResponse: function(response, callback) {
        if (!response.session) {
		  Framework.Facebook.user = null;
		  if( callback )
		  {
			callback();
		  }
          return;
        }

        // if we have a session, query for the user's profile picture and name
        FB.api(
          {
            method: 'fql.query',
            query: 'SELECT uid, name, sex, email, pic, activities, interests, about_me FROM user WHERE uid=' + FB.getSession().uid
          },
          function(response) {
            Framework.Facebook.user = response[0];
			Framework.Facebook.user.activities = Framework.Facebook.user.activities || '';
			Framework.Facebook.user.interests = Framework.Facebook.user.interests || '';
			Framework.Facebook.user.keywords = Framework.Facebook.user.interests + ',' + Framework.Facebook.user.activities;
			if( Framework.Facebook.user.keywords == ',' )
				Framework.Facebook.user.keywords = '';
			
			if( callback )
			{
				callback(); // trigger callback after loading info
			}
          }
        );
    }
  };
  
  window.fbAsyncInit = function() {
	var appid;
	if( window.location.href.match(/(open-circles)|(opencirclez)/) )
	{
		appid = 'c8587ca6fcf64d9c51e6b15a3c646cfe';
	}
	else if( window.location.href.match(/rpmdesign/) )
	{
		appid = 'e3135f6cdad27a6ae433ecb92811a6e0';
	}
	else
	{
		appid = 'cd833b5b32aaff3cee1d10bf99cc3eb1';
	} 
    FB.init({appId: appid, status: true, cookie: true,
             xfbml: true});

    if( window.location != window.parent.location )
		FB.Canvas.setAutoResize();
		
    // fetch the status on load
    FB.getLoginStatus(Framework.Facebook.handleSessionResponse);
	Framework.Facebook.initialized = true;
      /*
      $('#login').bind('click', function() {
        FB.login(Framework.Facebook.handleSessionResponse,{perms:'user_activities,user_interests,user_likes,email'});
      });

      $('#logout').bind('click', function() {
        FB.logout(Framework.Facebook.handleSessionResponse);
      });

      $('#disconnect').bind('click', function() {
        FB.api({ method: 'Auth.revokeAuthorization' }, function(response) {
        });
      });
		*/
  };
