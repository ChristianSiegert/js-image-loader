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
		// container and still be loaded. Value can be string "auto" or integer.
		maxDistance: "auto",

		// CSS class that is used to hide empty image elements from people with
		// JavaScript disabled
		noJsClass: "no-js",

		onComplete: function() {
			console.log("Loading images completed.");
		},

		onError: function(element) {
			console.log("Image failed to load: " + element.getProperty(this.options.dataAttribute));
			element.getParent().destroy();
		},

		onLoad: function(element) {
			console.log("Image loaded: " + element.getProperty(this.options.dataAttribute));
			element.setProperty("src", element.getProperty(this.options.dataAttribute));
		}
	},

	initialize: function(options) {
		// Merge provided options with default options
		this.setOptions(options);

		// Make hidden image elements visible for people with JavaScript enabled
		$(document.body).removeClass(this.options.noJsClass);

		// Number of loaded images
		this.loadedImagesCount = 0;

		// Flag for whether all images were loaded
		this.completed = false;

		// Number of running downloads
		this.concurrentDownloads = 0;

		// Timeout IDs of delayed functions (queued downloads)
		this.timeoutIds = [];

		this.loadedElements = [];
		this.unloadedElements = this.options.elements.slice();

		this.loadedElementsCoordinates = [];
		this.unloadedElementsCoordinates = [];

		this.elementsToLoad = [];
		this.containerCoordinates = {};

		// Distance zone 1: "Visible area"
		this.DISTANCE_ZONE_1 = 1;

		// Distance zone 2: "Outside of visible area but within maxDistance"
		this.DISTANCE_ZONE_2 = 2;

		// Distance zone 3: "Outside of visible area and outside of maxDistance"
		this.DISTANCE_ZONE_3 = 3;
	},

	/**
	 * Starts the image loader.
	 */
	run: function() {
		this.cacheContainerCoordinates();
		this.cacheElementCoordinates();
		this.cacheMaxDistance();
		this.cacheOriginalSrc();
		this.manageImages();

		var delay = Browser.Platform.mac || Browser.Platform.ios ? 0 : 5;

		window.addEvent("resize", function() {
			if (this.resizeTimeoutId) {
				clearTimeout(this.resizeTimeoutId);
			}

			this.resizeTimeoutId = function() {
				this.cacheContainerCoordinates();
				this.cacheElementCoordinates();
				this.cacheMaxDistance();
				this.manageImages();
			}.bind(this).delay(delay);
		}.bind(this));

		window.addEvent("scroll", function() {
			if (this.scrollTimeoutId) {
				clearTimeout(this.scrollTimeoutId);
			}

			this.scrollTimeoutId = function() {
				this.cacheContainerCoordinates();
				this.manageImages();
			}.bind(this).delay(delay);
		}.bind(this));
	},

	/**
	 * Gives image loader control over provided image elements.
	 */
	manageElements: function(elements) {
		this.completed = false;

		this.options.elements = this.options.elements.concat(elements);
		this.unloadedElements = this.unloadedElements.concat(elements);

		this.cacheElementCoordinates();
		this.cacheOriginalSrc();
		this.manageImages();
	},

	cacheContainerCoordinates: function() {
		var containerScroll = this.options.container.getScroll();
		var containerSize = this.options.container.getSize();

		this.containerCoordinates = {
			bottom: containerScroll.y + containerSize.y,
			left: containerScroll.x,
			right: containerScroll.x + containerSize.x,
			top: containerScroll.y
		}
	},

	cacheElementCoordinates: function() {
		this.loadedElementsCoordinates = [];
		this.unloadedElementsCoordinates = [];

		for (var i = 0; i < this.loadedElements.length; i++) {
			this.loadedElementsCoordinates.push(this.loadedElements[i].getCoordinates());
		}

		for (var i = 0; i < this.unloadedElements.length; i++) {
			this.unloadedElementsCoordinates.push(this.unloadedElements[i].getCoordinates());
		}
	},

	cacheMaxDistance: function() {
		if (this.options.maxDistance === "auto") {
			this.maxDistanceX = screen.width * 2;
			this.maxDistanceY = screen.height * 2;
			return;
		}

		this.maxDistanceX = this.options.maxDistance;
		this.maxDistanceY = this.options.maxDistance;
	},

	cacheOriginalSrc: function() {
		for (var i = 0; i < this.options.elements.length; i++) {
			this.options.elements[i].store("originalSrc", this.options.elements[i].getProperty("src"));
		}
	},

	manageImages: function() {
		this.cancelQueuedDownloads();
		this.unloadLoadedElements();
		this.loadUnloadedElements();
		this.loadConcurrently();
	},

	cancelQueuedDownloads: function() {
		for (var i = 0; i < this.timeoutIds.length; i++) {
			clearTimeout(this.timeoutIds[i]);
		}

		this.timeoutIds = [];
	},

	unloadLoadedElements: function() {
		for (var i = 0; i < this.loadedElements.length; i++) {
			if (this.getElementDistanceZone(this.loadedElementsCoordinates[i], this.containerCoordinates) === this.DISTANCE_ZONE_3) {
				this.loadedElements[i].setProperty("src", this.loadedElements[i].retrieve("originalSrc"));
				this.unloadedElements.push(this.loadedElements.splice(i, 1)[0]);
				this.unloadedElementsCoordinates.push(this.loadedElementsCoordinates.splice(i, 1)[0]);
				i--;
			}
		}
	},

	loadUnloadedElements: function() {
		var highPriorityElements = [];
		var lowPriorityElements = [];

		for (var i = 0; i < this.unloadedElements.length; i++) {
			var elementDistanceZone = this.getElementDistanceZone(this.unloadedElementsCoordinates[i], this.containerCoordinates);

			switch (elementDistanceZone) {
				case this.DISTANCE_ZONE_1: highPriorityElements.push(this.unloadedElements[i]); break;
				case this.DISTANCE_ZONE_2: lowPriorityElements.push(this.unloadedElements[i]); break;
			}
		}

		this.elementsToLoad = highPriorityElements.concat(lowPriorityElements);
	},

	loadConcurrently: function() {
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
	 */
	loadImage: function(imageElement) {
		this.concurrentDownloads++;

		var image = new Image();
		image.addEvent("error", this.imageEventHandler.bind(this, "error", imageElement));
		image.addEvent("load", this.imageEventHandler.bind(this, "load", imageElement));

		var index = this.unloadedElements.indexOf(imageElement);
		this.loadedElements.push(this.unloadedElements.splice(index, 1)[0]);
		this.loadedElementsCoordinates.push(this.unloadedElementsCoordinates.splice(index, 1)[0]);

		// Start loading the image
		image.src = imageElement.getProperty(this.options.dataAttribute);
	},

	imageEventHandler: function(eventName, imageElement) {
		this.concurrentDownloads--;

		// Relay the image event
		this.fireEvent(eventName, imageElement);

		// Mark image as loaded
		if (!imageElement.retrieve("loaded")) {
			imageElement.store("loaded", true);
			this.loadedImagesCount++;
		}

		// If this was the last image to load, fire "complete" event
		if (this.loadedImagesCount === this.options.elements.length
				&& !this.completed) {
			this.completed = true;
			this.fireEvent("complete");
			return;
		}

		// Queue next image
		var timeoutId = this.loadNextImage.bind(this).delay(this.options.delay);
		this.timeoutIds.push(timeoutId);
	},

	getElementDistanceZone: function(imageElementCoordinates, containerCoordinates) {
		// If element is in visible area
		if (imageElementCoordinates.bottom >= containerCoordinates.top
				&& imageElementCoordinates.top <= containerCoordinates.bottom
				&& imageElementCoordinates.right >= containerCoordinates.left
				&& imageElementCoordinates.left <= containerCoordinates.right) {
			return this.DISTANCE_ZONE_1;
		}

		// If element is outside of visible area but within maxDistance
		if (imageElementCoordinates.bottom >= containerCoordinates.top - this.maxDistanceY
				&& imageElementCoordinates.top <= containerCoordinates.bottom + this.maxDistanceY
				&& imageElementCoordinates.right >= containerCoordinates.left - this.maxDistanceX
				&& imageElementCoordinates.left <= containerCoordinates.right + this.maxDistanceX) {
			return this.DISTANCE_ZONE_2
		}

		// If element is outside of visible area and outside of maxDistance
		return this.DISTANCE_ZONE_3;
	}
});