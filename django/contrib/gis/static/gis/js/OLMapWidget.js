/* global ol */
'use strict';
// TODO: allow deleting individual features (#8972)
{
    const jsonFormat = new ol.format.GeoJSON();

    function MapWidget(options) {
        this.map = null;
        this.typeChoices = false;
        this.ready = false;

        // Default options
        this.options = {
            default_lat: 0,
            default_lon: 0,
            default_zoom: 12,
            is_collection: options.geom_name.includes('Multi') || options.geom_name.includes('Collection')
        };

        // Altering using user-provided options
        for (const property in options) {
            if (options.hasOwnProperty(property)) {
                this.options[property] = options[property];
            }
        }
        if (!options.base_layer) {
            this.options.base_layer = new ol.layer.Tile({source: new ol.source.OSM()});
        }

        this.featureCollection = new ol.Collection();
        this.featureOverlay = new ol.layer.Vector({
            source: new ol.source.Vector({
                features: this.featureCollection,
                useSpatialIndex: false // improve performance
            }),
            updateWhileAnimating: true, // optional, for instant visual feedback
            updateWhileInteracting: true // optional, for instant visual feedback
        });
        this.map = this.createMap();

        // Populate and set handlers for the feature container
        const self = this;
        this.featureCollection.on('add', function(event) {
            const feature = event.element;
            feature.on('change', function() {
                self.serializeFeatures();
            });
            if (self.ready) {
                self.serializeFeatures();
            }
        });

        const initial_value = document.getElementById(this.options.id).value;
        if (initial_value) {
            const feature = jsonFormat.readFeature('{"type": "Feature", "geometry": ' + initial_value + '}');
            const extent = ol.extent.createEmpty();

            if (this.options.is_collection){
                // If geometry collection, add each component individually so they may be
                // edited individually.
                var geometries = this.get_geometries(feature);
                geometries.forEach(function(geometry) {
                    this.featureOverlay.getSource().addFeature(new ol.Feature(geometry.clone()));
                    ol.extent.extend(extent, geometry.getExtent());
                }, this);
            } else {
                this.featureOverlay.getSource().addFeature(feature);
                ol.extent.extend(extent, feature.getGeometry().getExtent());
            }
            // Center/zoom the map
            this.map.getView().fit(extent, {maxZoom: this.options.default_zoom});
        } else {
            this.map.getView().setCenter(this.defaultCenter());
        }
        this.editBar = this.getEditBar();
        this.map.addControl(this.editBar);
        this.ready = true;
    }

    MapWidget.prototype.createMap = function() {
        const map = new ol.Map({
            target: this.options.map_id,
            layers: [this.options.base_layer, this.featureOverlay],
            view: new ol.View({
                zoom: this.options.default_zoom
            })
        });
        return map;
    };

    MapWidget.prototype.getEditBar = function(){

        var interactions = {};
        interactions.DrawRegular = false;
        interactions.Offset = false;
        interactions.Split = false;

        if (this.options.geom_name.includes('LineString')) {
            interactions.DrawPolygon = false;
            interactions.DrawHole = false;
            interactions.DrawPoint = false;
        }
        if (this.options.geom_name.includes('Polygon')) {
            interactions.DrawLine = false;
            interactions.DrawPoint = false;
        }
        if (this.options.geom_name.includes('Point')) {
            interactions.DrawLine = false;
            interactions.DrawPolygon = false;
            interactions.DrawHole = false;
        }
        return new ol.control.EditBar({ source: this.featureOverlay.getSource() ,
                                        interactions: interactions});
    };

    MapWidget.prototype.defaultCenter = function() {
        const center = [this.options.default_lon, this.options.default_lat];
        if (this.options.map_srid) {
            return ol.proj.transform(center, 'EPSG:4326', this.map.getView().getProjection());
        }
        return center;
    };

    MapWidget.prototype.get_geometries = function(feat){
        //return an array of geometry objects from a single feature
        var geom = feat.getGeometry();
        var feat_type = geom.getType();
        if (feat_type == 'Point' || feat_type == 'LineString' || feat_type == 'Polygon') {
            return [geom];
        }
        else if (feat_type == 'MultiPoint') {
            return geom.getPoints();
        }
        else if (feat_type == 'MultiLineString') {
            return geom.getLineStrings();
        }
        else if (feat_type == 'MultiPolygon') {
            return geom.getPolygons();
        }
        else if (feat_type == 'GeometryCollection') {
            return geom.getGeometries();
        }
        return [];
    };

    MapWidget.prototype.to_multi_feature = function(features){
        // convert the array of features created when drawing new features
        // to a single multi feature.
        var geom;
        if (this.options.geom_name == 'MultiPoint') {
            geom = new ol.geom.MultiPoint([])
            for (var i = 0; i < features.getLength(); i++){
                geom.appendPoint(features.item(i).getGeometry());
            }
        }
        else if (this.options.geom_name == 'MultiPolygon') {
            geom = new ol.geom.MultiPolygon([])
            for (var i = 0; i < features.getLength(); i++){
                geom.appendPolygon(features.item(i).getGeometry());
            }
        }
        else if (this.options.geom_name == 'MultiLineString') {
            geom = new ol.geom.MultiLineString([])
            for (var i = 0; i < features.getLength(); i++){
                geom.appendLineString(features.item(i).getGeometry());
            }
        }
        else if (this.options.geom_name == 'GeometryCollection') {
            geoms = [];
            for (var i = 0; i < features.getLength(); i++){
                geoms.push(features[i].getGeometry());
            }
            geom = new ol.geom.GeometryCollection(geoms);
        }
        return new ol.Feature(geom);
    };

    MapWidget.prototype.clearFeatures = function() {
        this.featureCollection.clear();
        // Empty textarea widget
        document.getElementById(this.options.id).value = '';
    };

    MapWidget.prototype.serializeFeatures = function() {
        // Three use cases: GeometryCollection, multigeometries, and single geometry
        let geometry = null;
        const features = this.featureCollection;
        if (features.getLength() == 0) {
            // Empty textarea widget if all features are deleted
            document.getElementById(this.options.id).value = '';
            return;
        }
        if (this.options.is_collection) {
            var feature = this.to_multi_feature(features);
            geometry = feature.getGeometry();
        } else {
            // Keep only the last feature of the list
            while (features.getLength() > 1) {
                features.removeAt(0);
            }
            var feature = features.item(0);
            geometry = feature.getGeometry();
        }
        document.getElementById(this.options.id).value = jsonFormat.writeGeometry(geometry);
    };

    window.MapWidget = MapWidget;
}
