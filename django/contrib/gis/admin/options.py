from django.contrib.gis import admin
from django.contrib.gis.db import models
from django.contrib.gis.forms import OSMWidget

class GeoModelAdmin(admin.ModelAdmin):
    def formfield_for_dbfield(self, db_field, request, **kwargs):
        if isinstance(db_field, models.GeometryField) and db_field.dim < 3:
            kwargs['widget'] = OSMWidget()
            return db_field.formfield(**kwargs)
        else:
            return super(admin.ModelAdmin, self).formfield_for_dbfield(db_field, request, **kwargs)
