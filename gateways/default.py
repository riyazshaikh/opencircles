import cgi
import simplejson as json
#import json
import re
from models import events
from models import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

class EventAdder(webapp.RequestHandler):
		
	def get(self):
		self.response.headers['Content-Type'] = 'text/html'
		ui = zg.Ui()
		self.response.out.write(ui.pageDump())

	def post(self):
		dem = events.OzEventManager()
		id = self.request.get('id')
		usr = self.request.get('owner')
		title = self.request.get('title')
		desc = self.request.get('description')
		start = self.request.get('starttime')
		timeless = self.request.get('timeless')
		city = self.request.get('city')
		address = self.request.get('address')
		url = self.request.get('url')
		cost = self.request.get('cost')
		notes = self.request.get('notes')
		latlong = self.request.get('latlong')
		pic = self.request.get('pic')
		tags = self.request.get('tags')
		self.response.out.write(dem.addEvent(id, usr, title, desc, start, timeless, city, address, latlong, url, cost, notes, pic, tags))
		
class EventSeek(webapp.RequestHandler):
	def get(self):
		keyword = self.request.get('keyword')
		start = self.request.get('start')
		end = self.request.get('end')
		timeless = self.request.get('timeless')
		latlong = self.request.get('latlong')
		radius = self.request.get('radius')
		owner = self.request.get('owner')
		url = self.request.get('url')
		self.response.headers['Content-Type'] = 'text/javascript'
		dem = events.OzEventManager()
		results = json.dumps(dem.searchEvent(keyword, start, end, timeless, latlong, radius, owner, url))
		oum = events.OzUserManager()
		oum.addUserActivity(keyword, latlong)
		if self.request.get('callback') != "": # support for jsonp
			results = self.request.get('callback') + '(' + results + ')'
		self.response.out.write(results)

class EventGet(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'text/javascript'
		dem = events.OzEventManager()
		results = json.dumps(dem.getEvent(self.request.get('eventid')))
		if self.request.get('callback') != "": # support for jsonp
			results = self.request.get('callback') + '(' + results + ')'
		self.response.out.write(results)

class EventCheck(webapp.RequestHandler):
	def get(self):
		title = self.request.get('title')
		start = self.request.get('start')
		self.response.headers['Content-Type'] = 'text/javascript'
		dem = events.OzEventManager()
		results = dem.eventExists(title, start)
		results = json.dumps(results)
		if self.request.get('callback') != "": # support for jsonp
			results = self.request.get('callback') + '(' + results + ')'
		self.response.out.write(results)
	
class MessageAdd(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'text/javascript'
		dem = events.OzEventManager()
		results = dem.addMessage( self.request.get('eventid'), self.request.get('message') )
		results = json.dumps(results)
		if self.request.get('callback') != "": # support for jsonp
			results = self.request.get('callback') + '(' + results + ')'
		self.response.out.write(results)

class MessageGet(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'text/javascript'
		dem = events.OzEventManager()
		results = dem.getMessages( self.request.get('eventid') )
		results = json.dumps(results)
		if self.request.get('callback') != "": # support for jsonp
			results = self.request.get('callback') + '(' + results + ')'
		self.response.out.write(results)

class MessageSend(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'text/javascript'
		dem = events.OzEventManager()
		results = dem.sendMessage( self.request.get('from'), self.request.get('to'), self.request.get('subject'), self.request.get('message'), self.request.get('bcc'), self.request.get('fromName') )
		results = json.dumps(results)
		if self.request.get('callback') != "": # support for jsonp
			results = self.request.get('callback') + '(' + results + ')'
		self.response.out.write(results)

	def post(self):
		self.response.headers['Content-Type'] = 'text/javascript'
		dem = events.OzEventManager()
		results = dem.sendMessage( self.request.get('from'), self.request.get('to'), self.request.get('subject'), self.request.get('message'), self.request.get('bcc'), self.request.get('fromName') )
		results = json.dumps(results)
		if self.request.get('callback') != "": # support for jsonp
			results = self.request.get('callback') + '(' + results + ')'
		self.response.out.write(results)
		
class JanRain(webapp.RequestHandler):
	def post(self):
		dem = events.OzUserManager()
		results = dem.getJanRain( self.request.get('token'), self.request.get('latlong') )
		self.redirect(self.request.get('returnTo'))

class UserLoggedIn(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'text/javascript'
		dem = events.OzUserManager()
		results = dem.getLoggedInUser()
		results = json.dumps(results)
		if self.request.get('callback') != "": # support for jsonp
			results = self.request.get('callback') + '(' + results + ')'
		self.response.out.write(results)

class UserLogout(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'text/javascript'
		dem = events.OzUserManager()
		results = dem.logoutUser()
		results = json.dumps(results)
		if self.request.get('callback') != "": # support for jsonp
			results = self.request.get('callback') + '(' + results + ')'
		self.response.out.write(results)
	
class UsersFetch(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'text/javascript'
		dem = events.OzUserManager()
		results = dem.getUsers(self.request.get('activity'), self.request.get('latlong'), self.request.get('radius'), self.request.get('status'))
		results = json.dumps(results)
		if self.request.get('callback') != "": # support for jsonp
			results = self.request.get('callback') + '(' + results + ')'
		self.response.out.write(results)

class UserLogin(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'text/javascript'
		oum = events.OzUserManager()
		results = json.dumps(oum.loginUser(self.request.get('email'), self.request.get('password'), self.request.get('latlong'), self.request.get('activities'), self.request.get('referral')))

		if self.request.get('callback') != "": # support for jsonp
			results = self.request.get('callback') + '(' + results + ')'
		self.response.out.write(results)

class UserUpdate(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'text/javascript'
		oum = events.OzUserManager()
		results = json.dumps(oum.updateUser(self.request.get('activities'), self.request.get('email'), self.request.get('latlong'), self.request.get('name'), self.request.get('password'), self.request.get('url'), self.request.get('pic'), self.request.get('radius')))
		if self.request.get('callback') != "": # support for jsonp
			results = self.request.get('callback') + '(' + results + ')'
		self.response.out.write(results)

class UserReset(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'text/javascript'
		oum = events.OzUserManager()
		results = json.dumps(oum.resetUser(self.request.get('email'), self.request.get('latlong')))
		if self.request.get('callback') != "": # support for jsonp
			results = self.request.get('callback') + '(' + results + ')'
		self.response.out.write(results)
		
class SignAnonymous(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'text/javascript'
		oum = events.OzUserManager()
		if self.request.get('signin') != "":
			results = oum.anonSignin(self.request.get('signin'), self.request.get('latlong'))
		elif self.request.get('signout') != "":
			results = oum.anonSignout(self.request.get('signout'), self.request.get('latlong'))
		if self.request.get('callback') != "": # support for jsonp
			results = self.request.get('callback') + '(' + json.dumps(results) + ')'
		self.response.out.write(results)

class ImageHandler(webapp.RequestHandler):
	def post(self):
		self.response.headers['Content-Type'] = 'text/html'
		oim = events.OzImageManager()
		if re.search( 'multipart', self.request.headers['Content-Type'] ) is not None:
			content = self.request.get('qqfile')
		else:
			content = self.request.body
		result = oim.addImage(content, self.request.get('width'), self.request.get('height'))
		self.response.out.write(json.dumps(result))

	def get(self):
		self.response.headers['Content-Type'] = 'image/png'
		oim = events.OzImageManager()
		result = oim.getImage(self.request.get('id'))
		self.response.out.write(result)
		
application = webapp.WSGIApplication([('/add', EventAdder), ('/search', EventSeek), ('/getevent', EventGet), ('/exists', EventCheck), ('/addmsg', MessageAdd), ('/getmsgs', MessageGet), ('/sendmsg', MessageSend), ('/login', UserLogin), ('/updatelogin', UserUpdate), ('/getuser', UserLoggedIn), ('/logout', UserLogout), ('/resetpass', UserReset), ('/getusers', UsersFetch), ('/anonysign', SignAnonymous), ('/img', ImageHandler) ], debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
