{% load l10n %}
{% block vars %}var {{ module }} = {};
{{ module }}.map = null; {{ module }}.controls = null; {{ module }}.panel = null; {{ module }}.re = new RegExp("^SRID=\\d+;(.+)", "i"); {{ module }}.layers = {};
{{ module }}.modifiable = {{ modifiable|yesno:"true,false" }};
{{ module }}.wkt_f = new ol.format.WKT();
{{ module }}.is_collection = {{ is_collection|yesno:"true,false" }};
{{ module }}.collection_type = '{{ collection_type }}';
{{ module }}.is_generic = {{ is_generic|yesno:"true,false" }};
{{ module }}.is_linestring = {{ is_linestring|yesno:"true,false" }};
{{ module }}.is_polygon = {{ is_polygon|yesno:"true,false" }};
{{ module }}.is_point = {{ is_point|yesno:"true,false" }};
{% endblock %}
{{ module }}.get_ewkt = function(feat){
    return 'SRID={{ srid|unlocalize }};' + {{ module }}.wkt_f.writeFeature(feat, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    });
};
{{ module }}.read_wkt = function(wkt){
    // OpenLayers cannot handle EWKT -- we make sure to strip it out.
    // EWKT is only exposed to OL if there's a validation error in the admin.
    var match = {{ module }}.re.exec(wkt);
    if (match){wkt = match[1];}

    return {{ module }}.wkt_f.readFeature(wkt, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    });
};
{{ module }}.get_geometries = function(feat){
    //return an array of geometry objects from a single feature
    geom = feat.getGeometry();
    feat_type = geom.getType();
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
{{ module }}.to_multi_feature = function(features){
    // convert the array of features created when drawing new features
    // to a single multi feature.
    {% if geom_type == 'MultiPoint' %}
    geom = new ol.geom.MultiPoint([])
    for (var i = 0; i < features.length; i++){
        geom.appendPoint(features[i].getGeometry());
    }
    {% elif geom_type == 'MultiPolygon' %}
    geom = new ol.geom.MultiPolygon([])
    for (var i = 0; i < features.length; i++){
        geom.appendPolygon(features[i].getGeometry());
    }
    {% elif geom_type == 'MultiLineString' %}
    geom = new ol.geom.MultiLineString([])
    for (var i = 0; i < features.length; i++){
        geom.appendLineString(features[i].getGeometry());
    }
    {% elif geom_type == 'GeometryCollection' %}
    geoms = [];
    for (var i = 0; i < features.length; i++){
        geoms.push(features[i].getGeometry());
    }
    geom = new ol.geom.GeometryCollection(geoms);
    {% endif %}
    return new ol.Feature(geom);
}
{{ module }}.write_wkt = function(feat){
    // render the specified feature in WKT format and fill the form field
    var new_wkt = {{ module }}.get_ewkt(feat);
    document.getElementById('{{ id }}').value = new_wkt;
};
{{ module }}.add_wkt = function(event){
    // This function will sync the contents of the `vector` layer with the
    // WKT in the text field.
    if ({{ module }}.is_collection){
        var feat = {{ module }}.to_multi_feature({{ module }}.layersSource.getFeatures());
        {{ module }}.write_wkt(feat);
    } else {
        // Make sure to remove any previously added features.
        col = {{ module }}.layersSource.getFeatures();
        if (col.length > 1){
            old_feat = col[0];
            {{ module }}.layersSource.removeFeature(old_feat);
        }
        {{ module }}.write_wkt(event.feature);
    }
};
{{ module }}.modify_wkt = function(event){
    if ({{ module }}.is_collection){
        if ({{ module }}.is_point){
            {{ module }}.add_wkt(event);
            return;
        } else {
            // When modifying the selected components are added to the
            // vector layer so we only increment to the `num_geom` value.
            var feat = {{ module }}.to_multi_feature({{ module }}.layersSource.getFeatures());
            {{ module }}.write_wkt(feat);
        }
    } else {
        {{ module }}.write_wkt(event.feature);
    }
};
// Function to clear vector features and purge wkt from div
{{ module }}.clearFeatures = function (){
    {{ module }}.layersSource.clear();
    document.getElementById('{{ id }}').value = '';
    {% localize off %}
        {{ module }}.map.setView(new ol.View({
          center: ol.proj.fromLonLat([{{ default_lon }}, {{ default_lat }}]),
          zoom: {{ default_zoom }}
        }));
    {% endlocalize %}
};
{{ module }}.drawMode = function(type){
    if ({{ module }}.currentInteraction) {
        {{ module }}.map.removeInteraction({{ module }}.currentInteraction);
    }
    {{ module }}.currentInteraction = new ol.interaction.Draw({
      source: {{ module }}.layersSource,
      type: type
    });
    {{ module }}.map.addInteraction({{ module }}.currentInteraction);
};
{{ module }}.drawPathMode = function(){
    {{ module }}.drawMode('LineString')
};
{{ module }}.drawPolygonMode = function(){
    {{ module }}.drawMode('Polygon')
};
{{ module }}.drawPointMode = function(){
    {{ module }}.drawMode('Point')
};
{{ module }}.modifyFeatureMode = function(){
    if ({{ module }}.currentInteraction) {
        {{ module }}.map.removeInteraction({{ module }}.currentInteraction);
    }
    {{ module }}.currentInteraction = new ol.interaction.Modify({
      features: {{ module }}.select.getFeatures()
    });
    {{ module }}.map.addInteraction({{ module }}.currentInteraction);
};
// Add Select control
{{ module }}.enableSelecting = function(){
    {{ module }}.select = new ol.interaction.Select({
      wrapX: false
    });
    {{ module }}.map.addInteraction({{ module }}.select);
};
// Create an array of controls based on geometry type
{{ module }}.getControls = function(lyr){
    {{ module }}.controls = document.createElement('div');
    {{ module }}.controls.className = 'olEditingControl ol-unselectable ol-control ol-uncollapsible ';
    {{ module }}.panel = new ol.control.Control({element: {{ module }}.controls})

    if (!{{ module }}.modifiable && lyr.source.getFeatures().length) return;
    if ({{ module }}.is_linestring || {{ module }}.is_generic){
        var elem = document.createElement('button');
        elem.innerHTML = 'Draw path';
        elem.type = 'Button';
        elem.addEventListener('click', {{ module }}.drawPathMode);
        {{ module }}.controls.appendChild(elem);
    }
    if ({{ module }}.is_polygon || {{ module }}.is_generic){
        var elem = document.createElement('button');
        elem.innerHTML = 'Draw polygon';
        elem.type = 'Button';
        elem.addEventListener('click', {{ module }}.drawPolygonMode);
        {{ module }}.controls.appendChild(elem);
    }
    if ({{ module }}.is_point || {{ module }}.is_generic){
        var elem = document.createElement('button');
        elem.innerHTML = 'Draw point';
        elem.type = 'Button';
        elem.addEventListener('click', {{ module }}.drawPointMode);
        {{ module }}.controls.appendChild(elem);
    }
    if ({{ module }}.modifiable){
        var elem = document.createElement('button');
        elem.innerHTML = 'Select feature';
        elem.type = 'Button';
        elem.addEventListener('click', {{ module }}.modifyFeatureMode);
        {{ module }}.controls.appendChild(elem);

        var elem = document.createElement('button');
        elem.innerHTML = 'Delete all features';
        elem.type = 'Button';
        elem.addEventListener('click', {{ module }}.clearFeatures);
        {{ module }}.controls.appendChild(elem);
    }
};

{{ module }}.init = function(){
    {% block map_options %}// The options hash, w/ zoom, resolution, and projection settings.
    var options = {
{% autoescape off %}{% for item in map_options.items %}      '{{ item.0 }}' : {{ item.1 }}{% if not forloop.last %},{% endif %}
{% endfor %}{% endautoescape %}    };{% endblock %}
    // The admin map for this geometry field.
    {% block map_creation %}

    options['target'] = '{{ id }}_map';
    {{ module }}.map = new ol.Map(options);
    // Base Layer
    {{ module }}.layers.base = new ol.layer.Tile({
      source: new ol.source.OSM()
    });

    {{ module }}.map.addLayer({{ module }}.layers.base);
    {% endblock %}
    {% block extra_layers %}{% endblock %}

    {{ module }}.layersSource = new ol.source.Vector();
    {{ module }}.layers.vector = new ol.layer.Vector({
      source: {{ module }}.layersSource
    });

    {{ module }}.map.addLayer({{ module }}.layers.vector);
    // Read WKT from the text field.
    var wkt = document.getElementById('{{ id }}').value;
    if (wkt){
        // After reading into geometry, immediately write back to
        // WKT <textarea> as EWKT (so that SRID is included).
        var admin_geom = {{ module }}.read_wkt(wkt);
        {{ module }}.write_wkt(admin_geom);
        if ({{ module }}.is_collection){
            // If geometry collection, add each component individually so they may be
            // edited individually.
            geometries = {{ module }}.get_geometries(admin_geom);
            for (var i = 0; i < geometries.length; i++){
                {{ module }}.layersSource.addFeature(new ol.Feature(geometries[i].clone()));
            }
        } else {
            {{ module }}.layersSource.addFeature(admin_geom);
        }

        // Zooming to the bounds.
        {{ module }}.map.getView().fit(admin_geom.getGeometry());
    } else {
        {% localize off %}
        {{ module }}.map.setView(new ol.View({
          center: ol.proj.fromLonLat([{{ default_lon }}, {{ default_lat }}]),
          zoom: {{ default_zoom }}
        }));
        {% endlocalize %}
    }
    // This allows editing of the geographic fields -- the modified WKT is
    // written back to the content field (as EWKT, so that the ORM will know
    // to transform back to original SRID).
    {{ module }}.layersSource.on('addfeature', {{ module }}.add_wkt);
    {{ module }}.layersSource.on('changefeature', {{ module }}.modify_wkt);
    {% block controls %}
    
    // Map controls:
    // Add geometry specific panel of toolbar controlsz
    {{ module }}.getControls({{ module }}.layers.vector);
    {{ module }}.map.addControl({{ module }}.panel);

    {{ module }}.enableSelecting();
    {% endblock %}
    if (wkt){
        if ({{ module }}.modifiable){
            {{ module }}.modifyFeatureMode();
        }
    }
};
