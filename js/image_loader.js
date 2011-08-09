var ImageLoader = new Class({
	Implements: [Events, Options],

	Binds: ["loadConcurrently"],

	options: {
		// Name of the "img" elements' data attribute that stores the image URL
		dataAttribute: "data-src",

		// Delay between loading two images (in milliseconds)
		delay: 0,

		// Array of "img" elements whose content we want to lazy load
		elements: [],

		// Maximum number of concurrent downloads
		maxConcurrentDownloads: 4,

		// Only load images that are not further below the fold than this (in px)
		maxDistance: 250
	},

	initialize: function(options) {
		// Merge provided options with default options
		this.setOptions(options);

		// Index of the image that is loaded next
		this.index = 0;

		// Number of loaded images
		this.loadedImagesCount = 0;

		// Number of running downloads
		this.concurrentDownloads = 0;

		// Timeout IDs of delayed functions (queued downloads)
		this.timeoutIds = [];
	},

	/**
	 * Starts the image loader.
	 */
	run: function() {
		this.loadConcurrently();

		window.addEvent("resize", this.loadConcurrently);
		window.addEvent("scroll", this.loadConcurrently);
	},

	/**
	 * Loads images concurrently and in order.
	 */
	loadConcurrently: function() {
		// Cancel any queued downloads
		for (var i = 0; i < this.timeoutIds.length; i++) {
			clearTimeout(this.timeoutIds[i]);
			this.timeoutIds.splice(i, 1);
		}

		// Start downloads
		for (var i = this.concurrentDownloads; i < this.options.maxConcurrentDownloads; i++) {
			this.loadNextImage();
		}
	},

	/**
	 * Loads the next image that is not loaded or loading yet.
	 */
	loadNextImage: function() {
		if (this.index >= this.options.elements.length) {
			return;
		}

		var fold = window.getSize().y + window.getScroll().y;

		if (this.options.elements[this.index].getPosition().y > fold + this.options.maxDistance) {
			return;
		}

		this.loadImage(this.index++);
	},

	/**
	 * Loads a particular image.
	 *
	 * Fires a class-wide "load" event if the image loaded, otherwise an "error"
	 * event. Also fires a class-wide "complete" event if it was the last image
	 * to load.
	 * @param integer index Position in the array "this.options.elements"
	 */
	loadImage: function(index) {
		var image = new Image();

		image.addEvent("error", this.imageEventHandler.bind(this, "error", this.options.elements[index]));
		image.addEvent("load", this.imageEventHandler.bind(this, "load", this.options.elements[index]));

		this.concurrentDownloads++;

		// Start loading the image
		image.src = this.options.elements[index].getProperty(this.options.dataAttribute);
	},

	imageEventHandler: function(eventName, imageElement) {
		this.concurrentDownloads--;

		// Relay the image event
		this.fireEvent(eventName, imageElement);

		// If this was the last image to load, fire the "complete" event
		if (++this.loadedImagesCount === this.options.elements.length) {
			window.removeEvent("resize", this.loadConcurrently);
			window.removeEvent("scroll", this.loadConcurrently);

			this.fireEvent("complete");
			return;
		}

		var timeoutId = this.loadNextImage.bind(this).delay(this.options.delay);
		this.timeoutIds.push(timeoutId);
	}
});

// Example usage
window.addEvent("domready", function() {
	$(document.body).removeClass("js-off");

	var imageLoader = new ImageLoader({
		elements: $$(".image"),
		maxConcurrentDownloads: 2,
		maxDistance: 300
	});

	imageLoader.addEvent("complete", function() {
		console.log("Loading images completed.");
	});

	imageLoader.addEvent("error", function(element) {
		console.log("Image failed to load: " + element.getProperty(this.options.dataAttribute));
		element.getParent().destroy();
	});

	imageLoader.addEvent("load", function(element) {
		console.log("Image loaded: " + element.getProperty(this.options.dataAttribute));

		element.setProperty("src", element.getProperty(this.options.dataAttribute));
		element.removeProperty(this.options.dataAttribute);
	});

	imageLoader.run();
});