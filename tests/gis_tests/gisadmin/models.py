from django.contrib.gis.db import models

from ..admin import admin


class City2(models.Model):
    name = models.CharField(max_length=30)
    point = models.PointField()

    class Meta:
        app_label = 'geoadmin2'

    def __str__(self):
        return self.name


site = admin.AdminSite(name='admin_gis2')
site.register(City2, admin.GISModelAdmin)
