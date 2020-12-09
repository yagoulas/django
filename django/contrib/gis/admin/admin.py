from django.contrib.admin import ModelAdmin
from django.contrib.gis.db.models import GeometryField
from django.contrib.gis.forms import OSMWidget


class GISModelAdmin(ModelAdmin):
    widget = OSMWidget

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        if isinstance(db_field, GeometryField) and db_field.dim < 3:
            kwargs['widget'] = self.widget()
            return db_field.formfield(**kwargs)
        else:
            return super(ModelAdmin, self).formfield_for_dbfield(db_field, request, **kwargs)
