function Track(id, title, artist, album) {
	this._id = id;
	this._title = title;
	this._artist = artist;
	this._album = album;
	this._spotifyUri = null;
}

// returns an encoded string for the search endpoint
Track.prototype.toString = function() {
	return encodeURIComponent('track:"' + this._title + '" artist:"' + this._artist + '"');
}

module.exports = Track;