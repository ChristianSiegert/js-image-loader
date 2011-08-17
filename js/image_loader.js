// ImageLoader class. Scroll to bottom for example usage.
var ImageLoader = new Class({
	Implements: [Events, Options],

	// Default options
	options: {
		container: window,

		// Name of the "img" elements' data attribute that stores the image URL
		dataAttribute: "data-src",

		// Delay between loading two images (in milliseconds)
		delay: 0,

		// Array of "img" elements whose content we want to lazy load
		elements: [],

		// Maximum number of concurrent downloads
		maxConcurrentDownloads: 4,

		// Maximum distance that images can be away from the visible part of the
		// container and still be loaded
		maxDistance: 250,

		// CSS class that is used to hide empty image elements from people with
		// JavaScript disabled
		noJsClass: "no-js"
	},

	initialize: function(options) {
		// Merge provided options with default options
		this.setOptions(options);

		// Make hidden image elements visible for people with JavaScript enabled
		$(document.body).removeClass(this.options.noJsClass);

		// Number of loaded images
		this.loadedImagesCount = 0;

		// Number of running downloads
		this.concurrentDownloads = 0;

		// Timeout IDs of delayed functions (queued downloads)
		this.timeoutIds = [];

		this.unloadedElements = this.options.elements.slice();
		this.loadedElements = [];
		this.elementsToLoad = [];

		this.fetchCoordinates();
		this.fetchOriginalSrc();
		this.fetchSizes();
	},

	/**
	 * Starts the image loader.
	 */
	run: function() {
		this.loadConcurrently();

		window.addEvent("resize", function() {
			this.fetchCoordinates();
			this.fetchSizes();
			this.loadConcurrently();
		}.bind(this));

		window.addEvent("scroll", function() {
			this.fetchSizes();
			this.loadConcurrently();
		}.bind(this));
	},

	fetchCoordinates: function() {
		for (var i = 0; i < this.options.elements.length; i++) {
			this.options.elements[i].store("coordinates", this.options.elements[i].getCoordinates());
		}
	},

	fetchOriginalSrc: function() {
		for (var i = 0; i < this.options.elements.length; i++) {
			this.options.elements[i].store("originalSrc", this.options.elements[i].getProperty("src"));
		}
	},

	fetchSizes: function() {
		this.containerScroll = this.options.container.getScroll();
		this.containerSize = this.options.container.getSize();

		this.containerBottom = this.containerScroll.y + this.containerSize.y + this.options.maxDistance;
		this.containerLeft = this.containerScroll.x - this.options.maxDistance
		this.containerRight = this.containerScroll.x + this.containerSize.x + this.options.maxDistance;
		this.containerTop = this.containerScroll.y - this.options.maxDistance;
	},

	/**
	 * Loads images concurrently and in order.
	 */
	loadConcurrently: function() {
		// Cancel any queued downloads
		for (var i = 0; i < this.timeoutIds.length; i++) {
			clearTimeout(this.timeoutIds[i]);
		}
		this.timeoutIds = [];

		// Unload any loaded elements if necessary
		for (var i = 0; i < this.loadedElements.length; i++) {
			if (!this.elementIsVisible(this.loadedElements[i])) {
				this.loadedElements[i].setProperty("src", this.loadedElements[i].retrieve("originalSrc"));
				this.unloadedElements.push(this.loadedElements.splice(i, 1)[0]);
				i--;
			}
		}

		// Prepare to load unloaded elements
		this.elementsToLoad = [];

		for (var i = 0; i < this.unloadedElements.length; i++) {
			if (this.elementIsVisible(this.unloadedElements[i])) {
				this.elementsToLoad.push(this.unloadedElements[i]);
			}
		}

		// Start downloads
		for (var i = this.concurrentDownloads; i < this.options.maxConcurrentDownloads; i++) {
			this.loadNextImage();
		}
	},

	/**
	 * Loads the next image.
	 */
	loadNextImage: function() {
		if (this.elementsToLoad.length === 0) {
			return;
		}

		this.loadImage(this.elementsToLoad.splice(0, 1)[0]);
	},

	/**
	 * Loads a particular image.
	 *
	 * Fires a class-wide "load" event if the image loaded, otherwise an "error"
	 * event. Also fires a class-wide "complete" event if it was the last image
	 * to load.
	 * @param integer index Position in the array "this.options.elements"
	 */
	loadImage: function(imageElement) {
		var image = new Image();

		image.addEvent("error", this.imageEventHandler.bind(this, "error", imageElement));
		image.addEvent("load", this.imageEventHandler.bind(this, "load", imageElement));

		this.concurrentDownloads++;
		this.unloadedElements.splice(this.unloadedElements.indexOf(imageElement), 1);
		this.loadedElements.push(imageElement);

		// Start loading the image
		image.src = imageElement.getProperty(this.options.dataAttribute);
	},

	imageEventHandler: function(eventName, imageElement) {
		this.concurrentDownloads--;

		// Relay the image event
		this.fireEvent(eventName, imageElement);

		// If this was the last image to load, fire the "complete" event
		if (++this.loadedImagesCount === this.options.elements.length) {
			this.fireEvent("complete");
			return;
		}

		// Queue next image
		var timeoutId = this.loadNextImage.bind(this).delay(this.options.delay);
		this.timeoutIds.push(timeoutId);
	},

	elementIsVisible: function(imageElement) {
		var imageElementCoordinates = imageElement.retrieve("coordinates");

		return imageElementCoordinates.bottom >= this.containerTop
			&& imageElementCoordinates.top <= this.containerBottom
			&& imageElementCoordinates.right >= this.containerLeft
			&& imageElementCoordinates.left <= this.containerRight;
	}
});

// Example usage
window.addEvent("domready", function() {
	// Instantiate image loader. See ImageLoader.options for available options.
	var imageLoader = new ImageLoader({
		elements: $$(".image"),
		maxConcurrentDownloads: 2,
		maxDistance: 400
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
	});

	imageLoader.run();
});