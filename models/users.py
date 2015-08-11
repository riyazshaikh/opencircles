from google.appengine.ext import db

class OCUser(db.Model):
	identifier = db.StringProperty()
	dateCreated = db.DateTimeProperty()
	status = db.IntegerProperty()

class UserStatus(object):
	INACTIVE = 0
	ACTIVE = 1