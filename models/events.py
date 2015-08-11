from google.appengine.ext import db
from google.appengine.api import mail
from google.appengine.api import images
from gaesessions import get_current_session
from geo.geomodel import GeoModel
import math
from geo import geomath
import simplejson as json
#import json
import re
import urllib
import urllib2
import datetime
import hashlib
import random
import string

class OzImage(db.Model):
	content = db.BlobProperty()
	
class OzUser(GeoModel):
	name = db.StringProperty()
	email = db.EmailProperty()
	password = db.StringProperty()
	pic = db.StringProperty()
	url = db.StringProperty()
	status = db.IntegerProperty()
	activities = db.StringListProperty()
	last_login = db.DateTimeProperty()
	referral = db.StringProperty()
	radius = db.IntegerProperty()

class OzEvent(GeoModel):
	owner = db.StringProperty()
	title = db.StringProperty()
	description = db.TextProperty()
	starttime = db.IntegerProperty()
	pic = db.StringProperty()
	#endtime = db.IntegerProperty()
	timeless = db.BooleanProperty()
	city = db.StringProperty()
	address = db.TextProperty()
	url = db.StringProperty()
	cost = db.StringProperty()
	notes = db.TextProperty()
	hasmsg = db.IntegerProperty()
	tags = db.StringListProperty()

class OzMessage(db.Model):
	message = db.TextProperty()
	event = db.ReferenceProperty(OzEvent, collection_name="event_messages")
	user = db.ReferenceProperty(OzUser, collection_name="user_messages")

class OzImageManager(object):
	def addImage(self, content, width, height):
		if width == "":
			width = 50
		if height == "":
			height = 50
		img = images.resize(content, width, height)
		imgStorage = OzImage(content=db.Blob(img))
		imgStorage.put()
		return { 'path': '/img?id='+str(imgStorage.key().id()), 'success': True }
	
	def getImage(self, id):
		img = OzImage.get_by_id(int(id))
		return img.content
	
		
class OzUserManager(object):
	def updateUser(self, activities, email, latlong, name, password, url, pic, radius):
		session = get_current_session()
		usr = OzUser.get_by_id(int(session['userid']))
		if activities != "":
			usr.activities = activities.split(',')
		if email != "":
			usr.email = email
		if name != "":
			usr.name = name
		if pic != "":
			usr.pic = pic
		if url != "":
			usr.url = url
		if password != "":
			usr.password = hashlib.sha224(password).hexdigest()
		if radius != "":
			usr.radius = int(radius)
		if latlong != "":
			latitude = latlong.split(',')[0]
			longitude = latlong.split(',')[1]
			usr.location = db.GeoPt(latitude, longitude)
			usr.update_location()
		usr.status = 1
		usr.last_login = datetime.datetime.now()								
		usr.put()
		return { 'result': 'success' }
	
	def addUserActivity(self, activity, latlong=""):
		session = get_current_session()
		latitude = latlong.split(',')[0]
		longitude = latlong.split(',')[1]
		if session.is_active():
			usr = OzUser.get_by_id(int(session['userid']))
			if activity != "" and activity not in usr.activities:
				usr.activities.append(activity)
			usr.location = db.GeoPt(latitude, longitude)
			usr.update_location()
			usr.put()
	
	
	def loginUser(self, email, password, latlong, activities, referral):
		usr = OzUser.all().filter('email =', email).get()
		if usr is None:
			latitude = float(latlong.split(',')[0])
			longitude = float(latlong.split(',')[1])
			usr = OzUser(email=email, location=db.GeoPt(latitude,longitude))
			usr.update_location()
			usr.status = 1
			usr.last_login = datetime.datetime.now()
			if activities != "":
				usr.activities = activities.split(',')
			if referral != "":
				usr.referral = referral
			usr.put()
			session = get_current_session()
			session['userid'] = usr.key().id()
			return { 'id': usr.key().id(), 'new': True }
		elif usr.password is None or usr.password == hashlib.sha224(password).hexdigest():
			usr.last_login = datetime.datetime.now()				
			usr.put()
			session = get_current_session()
			session['userid'] = usr.key().id()
			return { 'id': usr.key().id() }
		else:
			return { "result": "wrong" }

	def logoutUser(self):
		session = get_current_session()
		if session.is_active():
			usr = OzUser.get_by_id(int(session['userid']))
			#usr.status = 0
			usr.put()
			session.terminate()
			return 'loggedout'
		else:
			return 'notloggedin'
	
	def resetUser(self, email, latlong):
		usr = OzUser.all().filter('email =', email).get()
		newpass = ''.join(random.choice(string.ascii_uppercase + string.digits) for x in range(5))
		if usr is None:
			self.addUser(email, latlong, email.split('@')[0], newpass)
		else:
			usr.password = hashlib.sha224(newpass).hexdigest()
			usr.put()
		dem = OzEventManager()
		dem.sendMessage('admin@opencirclez.com', email, 'Your password has been reset', 'Here is your new password for opencirclez.com - '+newpass)
		return { 'result': 'success'}
		
	def getLoggedInUser(self):
		session = get_current_session()
		if session.is_active():
			usr = OzUser.get_by_id(int(session['userid']))
			return { 'id': usr.key().id(), 'name': usr.name, 'email': usr.email, 'pic': usr.pic, 'url': usr.url, 'radius': usr.radius, 'activities': usr.activities }
		else:
			return { 'result': 'none' }
	
	# Get users that match, filtered for location/radius/activity/status, ordered by time
	def getUsers(self, activity, latlong, radius, status):
		eset = OzUser.all().filter('status =', 1)
		#if activity != "":
		#	eset.filter('activities =', activity.lower())
			
		eset.order("-last_login")

		latitude = float(latlong.split(',')[0])
		longitude = float(latlong.split(',')[1])
		results = OzEvent.proximity_fetch(eset, db.GeoPt(latitude, longitude), max_results=5, max_distance=int(radius)*1600)
		
		session = get_current_session()
		userList = []
		for usr in results:
			if session.is_active() and int(session['userid']) == usr.key().id():
				continue
			if Sanitizer().isOffensive(','.join(usr.activities)):
				continue
			if activity != "" and re.search(activity, ','.join(usr.activities)) is None:
				continue
			userList.append({ 'id': usr.key().id(), 'name': usr.name, 'pic': usr.pic, 'activities': usr.activities, 'url': usr.url, 'last_login': usr.last_login.isoformat() })
		return userList
	
	# Sign in anonymously
	def anonSignin(self, email, latlong):
		# close any active session the user has since he is trying to login
		session = get_current_session()

		latitude = float(latlong.split(',')[0])
		longitude = float(latlong.split(',')[1])
			
		usr = OzUser.all().filter('email =', email).get()
		if usr is None:
			usr = OzUser(email=email, location=db.GeoPt(latitude,longitude))
			usr.update_location()
			usr.status = 1
			usr.last_login = datetime.datetime.now()
			usr.put()
			session['userid'] = usr.key().id()
			return { 'result': 'signedin' }
		return { 'result': 'exists' }

		
	def anonSignout(self, email, latlong):
		# close any active session the user has since he is trying to logout
		session = get_current_session()
		if session.is_active():
			session.terminate()
		
		latitude = float(latlong.split(',')[0])
		longitude = float(latlong.split(',')[1])
	
		usr = OzUser.all().filter('email =', email).get()
		if usr is None:
			usr = OzUser(email=email, location=db.GeoPt(latitude,longitude))
			usr.update_location()
			usr.status = 0
			usr.last_login = datetime.datetime.now()
			usr.put()
			return { 'result': 'signedout' }
		else:
			usr.status = 0
			usr.last_login = datetime.datetime.now()
			usr.location = db.GeoPt(latitude, longitude)
			usr.update_location()
			usr.put()
			return { 'result': 'signedout' }

	def getUserDetails(self, userid):
		usr = OzUser.get_by_id(int(userid))
		return { 'id': usr.key().id(), 'name': usr.name, 'pic': usr.pic, 'url': usr.url, 'activities': usr.activities, 'radius': usr.radius }
			
class OzEventManager(object):
	def addMessage(self, eventid, message):
		e = OzEvent.get_by_id(int(eventid))
		session = get_current_session()
		if session.is_active():
			usr = OzUser.get_by_id(int(session['userid']))
		else:
			usr = OzUser.all().filter('email =', "anonymous@opencirclez.com").get()
		msg = OzMessage(event=e, user=usr, message=message)
		msg.put()
		
		if e.hasmsg is None:
			e.hasmsg = 1
		else:
			e.hasmsg = e.hasmsg + 1
		e.put()
		return msg.key().id()
	
	def sendMessage(self, msgFrom, msgTo, subj="", msg="", bcc="", fromName=""):
		try:
			msgFrom = OzUser.get_by_id(int(msgFrom)).email
		except ValueError:	
			msgFrom = msgFrom
			# use msgFrom as string
		if msgFrom is None:
			msgFrom = 'OpenCirclez <admin@opencirclez.com'
			
		try:
			msgTo = OzUser.get_by_id(int(msgTo)).email
		except ValueError:	
			msgTo = msgTo
			# use msgTo as string
		if msgTo is None:
			msgTo = 'OpenCirclez <admin@opencirclez.com>'
		
		if fromName == "":
			fromName = 'OpenCirclez'
		message = mail.EmailMessage(sender=fromName+" <admin@opencirclez.com>",
									subject=subj)

		message.to = msgTo
		message.reply_to = msgFrom
		message.bcc = bcc + ' ,anonymous@opencirclez.com' # to keep an eye on things
		message.html = msg
		message.body = re.sub(r'<[^>]*?>', '', msg) 
		if Sanitizer().isOffensive(subj+msg) == False:
			message.send()
			return { 'message': message.body }
		else:
			return { 'message': 'blocked' }
		
	def getMessages(self, eventid):
		eset = OzMessage.all()
		if eventid != "":
			e = OzEvent.get_by_id(int(eventid))	
			eset.filter('event =', e.key())
		
		itemsList = []
		for item in eset:
			if Sanitizer().isOffensive(item.message) == False:
				itemsList.append({ 'id': item.key().id(), 'user': OzUserManager().getUserDetails(item.user.key().id()), 'message': item.message })
		
		return itemsList
			
	def addEvent(self, id, owner, title, desc, startutc, timeless, cityname, address, latlong, url, cost, notes, pic, tags):
		latitude = float(latlong.split(',')[0])
		longitude = float(latlong.split(',')[1])
		if id != "": # update if exists
			e = OzEvent.get_by_id(int(id))
		else:
			e = OzEvent(location= db.GeoPt(latitude, longitude))
			
		e.title = title
		e.description = desc
		e.starttime = int(startutc)
		e.timeless = True if int(timeless) == 1 else False
		e.city = cityname
		e.owner = owner
		e.address = address
		e.location = db.GeoPt(latitude, longitude)
		e.update_location()
		e.url = url
		e.cost = cost
		e.notes = notes
		e.pic = pic
		if tags != "":
			e.tags = tags.split(',')
		e.put()
		return e.key().id()

	def getEvent(self, eventid):
		item = OzEvent.get_by_id(int(eventid))
		return { 'id': item.key().id(), 'title':item.title, 'description': item.description, 'hasmsg': item.hasmsg, 'url': item.url, 'owner': item.owner, 'address': item.address, 'cost': item.cost, 'starttime': item.starttime, 'timeless': item.timeless, 'city': item.city, 'pic': item.pic, 'tags': item.tags }
		
	def searchEvent(self, keyword="", startutc="", endutc="", timeless="", latlong="", radius="", owner="", url = ""):
		eset = OzEvent.all()
		if startutc != "":
			eset.filter('starttime >=', int(startutc))
		if endutc != "":
			eset.filter('starttime <=', int(endutc))
		if owner != "" and owner != 'superuser':
			eset.filter('owner =', owner)
		if url != "":
			eset.filter('url =', url)
		
		if radius == "":
			radius = 10
		eset.order('starttime')
		#eset.order('hasmsg')

		latitude = float(latlong.split(',')[0])
		longitude = float(latlong.split(',')[1])
		results = OzEvent.proximity_fetch(eset, db.GeoPt(latitude, longitude), max_results=100, max_distance=int(radius)*1600)

		if timeless != "" and int(timeless) == 1:
			eset2 = OzEvent.all().filter('timeless =', True)
			results.extend(OzEvent.proximity_fetch(eset2, db.GeoPt(latitude, longitude), max_results=10, max_distance=int(radius)*1600))

		itemsList = []
		idList = []
		for item in results:
			id = item.key().id()
			if id not in idList and Sanitizer().isOffensive(item.title) == False:
				itemsList.append({ 'id': id, 'title':item.title, 'description': item.description, 'hasmsg': item.hasmsg, 'url': item.url, 'owner': item.owner, 'address': item.address, 'cost': item.cost, 'starttime': item.starttime, 'timeless': item.timeless, 'latlong': str(item.location.lat)+','+str(item.location.lon), 'pic': item.pic, 'tags': item.tags, 'distance': geomath.distance(item.location, db.GeoPt(latitude,longitude)) })
				idList.append(id)
		return itemsList

	def eventExists(self, title, startutc="", endutc=""):
		eset = OzEvent.all()
		if startutc != "":
			eset.filter('starttime >=', int(startutc))
			eset.filter('starttime <', int(startutc)+(24*60*60*1000))
			
		words = title.lower().split(' ')
		for item in eset:
			matchTolerance = len(words) - 1 # allow 1 word to mismatch
			itemwords = item.title.lower().split(' ')
			for word in words:
				if word in itemwords:
					matchTolerance = matchTolerance - 1
			if matchTolerance <= 0:
				return { 'id': item.key().id(), 'title': item.title, 'description': item.description, 'url': item.url, 'owner': item.owner, 'address': item.address, 'cost': item.cost, 'starttime': item.starttime, 'endtime': item.endtime, 'city': item.city }
		
		return 0

class Sanitizer(object):
	def isOffensive(self, text):
		return True if re.search('sex|porn|fuck', text) is not None else False
		
class WGS(object):
	
	def __init__(self, a, b, f):
		self.transverse = a
		self.conjugate = b
		self.flattening = f

