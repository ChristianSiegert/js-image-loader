var ImageLoader = new Class({
	Implements: [Events, Options],

	options: {
		// Number of concurrent downloads
		concurrentDownloads: 4,

		// Name of the "img" elements' data attribute that stores the image URL
		dataAttribute: "data-src",

		// Delay between loading two images (in milliseconds)
		delay: 0,

		// Array of "img" elements whose content we lazy load
		elements: []
	},

	initialize: function(options) {
		// Merge provided options with default options
		this.setOptions(options);

		// Index of the image that is loaded next
		this.index = 0;

		// Number of loaded images
		this.loadedImagesCount = 0;
	},

	/**
	 * Starts the image loader.
	 */
	run: function() {
		// Load images concurrently and in order
		for (var i = 0; i < this.options.concurrentDownloads; i++) {
			this.loadNextImage();
		}
	},

	/**
	 * Loads the next image that is not loaded or loading yet.
	 */
	loadNextImage: function() {
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
		if (index >= this.options.elements.length) {
			return;
		}

		var image = new Image();

		image.addEvent("error", function() {
			// Relay the image "error" event
			this.fireEvent("error", this.options.elements[index]);

			// If this was the last image to load, fire the "complete" event
			if (++this.loadedImagesCount === this.options.elements.length) {
				this.fireEvent("complete");
				return;
			}

			this.loadNextImage.bind(this).delay(this.options.delay);
		}.bind(this));

		image.addEvent("load", function(event) {
			// Relay the image "load" event
			this.fireEvent("load", [this.options.elements[index], event]);

			// If this was the last image to load, fire the "complete" event
			if (++this.loadedImagesCount === this.options.elements.length) {
				this.fireEvent("complete");
				return;
			}

			this.loadNextImage.bind(this).delay(this.options.delay);
		}.bind(this));

		// Start loading the image
		image.src = this.options.elements[index].getProperty(this.options.dataAttribute);
	}
});

// Example usage
window.addEvent("domready", function() {
	var imageLoader = new ImageLoader({
		elements: $$(".image")
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