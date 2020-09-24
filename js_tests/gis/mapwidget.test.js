/* global QUnit, MapWidget */
'use strict';

QUnit.module('gis.OLMapWidget');

QUnit.test('MapWidget.initialFeature', function(assert) {
    document.getElementById('id_point').value = '{"type": "Point", "coordinates": [7.8177, 47.397]}';
    const options = {id: 'id_point', map_id: 'id_point_map', geom_name: 'Point'};
    const widget = new MapWidget(options);
    assert.equal(widget.featureCollection.getLength(), 1);
    widget.serializeFeatures();
    assert.equal(
        document.getElementById('id_point').value,
        '{"type":"Point","coordinates":[7.8177,47.397]}',
        'Point added to vector layer'
    );
});

QUnit.test('MapWidget.noFeatures', function(assert) {
    document.getElementById('id_point').value = "";
    const options = {id: 'id_point', map_id: 'id_point_map', geom_name: 'MultiPoint'};
    const widget = new MapWidget(options);
    assert.equal(widget.featureCollection.getLength(), 0);
    widget.serializeFeatures();
    assert.equal(document.getElementById('id_point').value, '', 'Point added to vector layer');
});

QUnit.test('MapWidget.featureAdded', function(assert) {
    document.getElementById('id_point').value = '{"type": "Point", "coordinates": [7.8177, 47.397]}';
    const options = {id: 'id_point', map_id: 'id_point_map', geom_name: 'Point'};
    const widget = new MapWidget(options);
    assert.equal(widget.featureCollection.getLength(), 1);
    let feature = new ol.Feature(new ol.geom.Point([1.1,1.2]));
    widget.featureCollection.insertAt(1, feature);
    assert.equal(widget.featureCollection.getLength(), 1);
    widget.serializeFeatures();
    assert.equal(
        document.getElementById('id_point').value,
        '{"type":"Point","coordinates":[1.1,1.2]}',
        'Point added to vector layer'
    );
});

QUnit.test('MapWidget.featuresAdded', function(assert) {
    document.getElementById('id_point').value = "";
    const options = {id: 'id_point', map_id: 'id_point_map', geom_name: 'MultiPoint'};
    const widget = new MapWidget(options);
    let feature = new ol.Feature(new ol.geom.Point([1.1,1.2]));
    widget.featureCollection.insertAt(0, feature);
    let feature2 = new ol.Feature(new ol.geom.Point([1.3,1.4]));
    widget.featureCollection.insertAt(1, feature2);
    assert.equal(widget.featureCollection.getLength(), 2);
    widget.serializeFeatures();
    assert.equal(
        document.getElementById('id_point').value,
        '{"type":"MultiPoint","coordinates":[[1.1,1.2],[1.3,1.4]]}',
        'Point added to vector layer'
    );
});

QUnit.test('MapWidget.map_srid', function(assert) {
    const options = {id: 'id_point', map_id: 'id_point_map', geom_name: 'Point'};
    const widget = new MapWidget(options);
    assert.equal(widget.map.getView().getProjection().getCode(), 'EPSG:3857', 'SRID 3857');
});

QUnit.test('MapWidget.defaultCenter', function(assert) {
    const options = {id: 'id_point', map_id: 'id_point_map', geom_name: 'Point'};
    let widget = new MapWidget(options);
    assert.equal(widget.defaultCenter().toString(), '0,0', 'Default center at 0, 0');
    options.default_lat = 47.08;
    options.default_lon = 6.81;
    widget = new MapWidget(options);
    assert.equal(
        widget.defaultCenter().toString(),
        '6.81,47.08',
        'Default center at 6.81, 47.08'
    );
    assert.equal(widget.map.getView().getZoom(), 12);
});

QUnit.test('MapWidget.clearFeatures', function(assert) {
    document.getElementById('id_point').value = '{"type": "Point", "coordinates": [7.8177, 47.397]}';
    const options = {id: 'id_point', map_id: 'id_point_map', geom_name: 'Point'};
    const widget = new MapWidget(options);
    const initial_value = document.getElementById('id_point').value;
    widget.clearFeatures();
    assert.equal(document.getElementById('id_point').value, "");
    document.getElementById('id_point').value = initial_value;
});

QUnit.test('MapWidget.multipolygon', function(assert) {
    document.getElementById('id_point').value = '{"type": "Point", "coordinates": [7.8177, 47.397]}';
    const options = {id: 'id_multipolygon', map_id: 'id_multipolygon_map', geom_name: 'MultiPolygon'};
    const widget = new MapWidget(options);
    assert.ok(widget.options.is_collection);
});

QUnit.test('MapWidget.IsCollection', function(assert) {
    document.getElementById('id_point').value = '{"type": "Point", "coordinates": [7.8177, 47.397]}';
    const options = {id: 'id_point', map_id: 'id_point_map', geom_name: 'Point'};
    let widget = new MapWidget(options);
    assert.notOk(widget.options.is_collection);
    // Empty the default initial Point
    document.getElementById('id_point').value = "";

    options.geom_name = 'Polygon';
    widget = new MapWidget(options);
    assert.notOk(widget.options.is_collection);

    options.geom_name = 'LineString';
    widget = new MapWidget(options);
    assert.notOk(widget.options.is_collection);

    options.geom_name = 'MultiPoint';
    widget = new MapWidget(options);
    assert.ok(widget.options.is_collection);

    options.geom_name = 'MultiPolygon';
    widget = new MapWidget(options);
    assert.ok(widget.options.is_collection);

    options.geom_name = 'MultiLineString';
    widget = new MapWidget(options);
    assert.ok(widget.options.is_collection);

    options.geom_name = 'GeometryCollection';
    widget = new MapWidget(options);
    assert.ok(widget.options.is_collection);
});
