from django.test import SimpleTestCase, override_settings

from .models import City2, site


@override_settings(ROOT_URLCONF='django.contrib.gis.tests.gisadmin.urls')
class GeoAdminTest(SimpleTestCase):

    def test_olwidget_empty_string(self):
        geoadmin = site._registry[City2]
        form = geoadmin.get_changelist_form(None)({'point': ''})
        with self.assertRaisesMessage(AssertionError, 'no logs'):
            with self.assertLogs('django.contrib.gis', 'ERROR'):
                output = str(form['point'])
        self.assertInHTML(
            '<textarea id="id_point" class="vSerializedField required" cols="150"'
            ' rows="10" name="point"></textarea>',
            output
        )

    def test_olwidget_invalid_string(self):
        geoadmin = site._registry[City2]
        form = geoadmin.get_changelist_form(None)({'point': 'INVALID()'})
        with self.assertLogs('django.contrib.gis', 'ERROR') as cm:
            output = str(form['point'])
        self.assertInHTML(
            '<textarea id="id_point" class="vSerializedField required" cols="150"'
            ' rows="10" name="point"></textarea>',
            output
        )
        self.assertEqual(len(cm.records), 1)
        self.assertEqual(
            cm.records[0].getMessage(),
            "Error creating geometry from value 'INVALID()' (String input "
            "unrecognized as WKT EWKT, and HEXEWKB.)"
        )
