import unittest
from unittest.mock import patch, MagicMock
import requests
import os

import agente


class TestAgente(unittest.TestCase):

    @patch('agente.requests.post')
    def test_enviar_dispositivo_api_exito(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        api_url = "http://localhost:8001/api/deteccion"
        mac = "68:58:A0:DB:7D:4D"
        agente_id = "TEST-HOST"

        resultado = agente.enviar_dispositivo_api(api_url, mac, agente_id)

        self.assertTrue(resultado)
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertEqual(args[0], api_url)
        self.assertEqual(kwargs["json"]["mac"], mac)
        self.assertEqual(kwargs["json"]["agente_id"], agente_id)

    @patch('agente.requests.post')
    def test_enviar_dispositivo_api_error_http(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.text = "Not Found"
        mock_post.return_value = mock_response

        api_url = "http://localhost:8001/api/deteccion"
        mac = "04:10:6B:9A:D9:4C"
        agente_id = "TEST-HOST"

        resultado = agente.enviar_dispositivo_api(api_url, mac, agente_id)

        self.assertFalse(resultado)

    @patch('agente.requests.post')
    def test_enviar_dispositivo_api_excepcion_red(self, mock_post):
        mock_post.side_effect = requests.RequestException("Error de conexión")

        api_url = "http://localhost:8001/api/deteccion"
        mac = "CC:00:F1:56:47:D6"
        agente_id = "TEST-HOST"

        resultado = agente.enviar_dispositivo_api(api_url, mac, agente_id)

        self.assertFalse(resultado)

    def test_cargar_configuracion_existente(self):
        config = agente.cargar_configuracion("config.json")
        self.assertIn("api_url", config)
        self.assertIn("network_range", config)
        self.assertIn("interface", config)


if __name__ == '__main__':
    unittest.main()
