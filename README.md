# OpenCirclez - Explore local events with a wider social circle

Live demo here - http://opencircles-dev.appspot.com/

A geolocation based activity aggregator that uses Meetup API to provide initial activities. Provides reverse geocoding capabilities using Google Maps API.

# Environment Setup:
- Download Google App Engine SDK.
- Add this folder as an existing Application.
- Browse to the site using GAE Launcher's Browse button

That's it! For details about the codebase, keep reading...

# Markup:
- Base file is index.html (obviously)
- Rest of the markup is under /html. 
- There is some templatized markup in files named tmpl_* which are fetched via XHR to inject into page.

# Javascript:

All the js code is under /js. The highest level logic would be under index.js, which calls the Framework code as follows - 
- Actions.js for triggering code to add activity, send message, share activity.
- ActivityStore.js for fetching local events from db as well as ones through meetup api.
- Analytics.js for keeping track of various user actions via Google Analytics event tracking.
- Authentication.js for janrain based authentication.
- Constants.js for containing some of the large string arrays.
- facebook.js for posting to Facebook.
- Services.js is the interface layer for XHR requests.
- Utils.js is just a collection of js utility scripts.

# GAE Server code:

For starters, look at app.yaml to know which urls are mapped to which files.
- Most of the service requests end up in default.py which in turn uses models from /models to organize the backend data.
- Support for geolocation search for events comes from the geo package in GAE.
- Pictures are stored as blobs as seen from events.py
- Javascript compressing is done server side by yuicompressor






