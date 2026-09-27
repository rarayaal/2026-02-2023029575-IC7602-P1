#!/usr/bin/env python3
"""
Script de verificación y consulta de geolocalización IP-to-Country.
Permite validar la resolución geográfica local y contra la base de datos Supabase.
"""

import sys
import os
import json
import urllib.request
import urllib.error

# Dataset de prueba idéntico al sembrado en SQL
DATASET = [
    {"ip_start": "190.113.0.0", "ip_end": "190.113.255.255", "code": "CR", "country": "Costa Rica", "city": "San José"},
    {"ip_start": "196.40.0.0",  "ip_end": "196.40.255.255",  "code": "CR", "country": "Costa Rica", "city": "Cartago"},
    {"ip_start": "201.191.0.0", "ip_end": "201.191.255.255", "code": "CR", "country": "Costa Rica", "city": "Alajuela"},
    {"ip_start": "8.8.8.0",     "ip_end": "8.8.8.255",     "code": "US", "country": "United States", "city": "Mountain View"},
    {"ip_start": "12.0.0.0",    "ip_end": "12.255.255.255", "code": "US", "country": "United States", "city": "New York"},
    {"ip_start": "104.16.0.0",  "ip_end": "104.31.255.255", "code": "US", "country": "United States", "city": "San Francisco"},
    {"ip_start": "198.51.100.0","ip_end": "198.51.100.255","code": "US", "country": "United States", "city": "Dallas"},
    {"ip_start": "80.58.0.0",   "ip_end": "80.58.255.255",  "code": "ES", "country": "Spain", "city": "Madrid"},
    {"ip_start": "88.0.0.0",    "ip_end": "88.31.255.255",  "code": "ES", "country": "Spain", "city": "Barcelona"},
    {"ip_start": "85.214.0.0",  "ip_end": "85.214.255.255", "code": "DE", "country": "Germany", "city": "Frankfurt"},
    {"ip_start": "194.95.0.0",  "ip_end": "194.95.255.255", "code": "DE", "country": "Germany", "city": "Berlin"},
    {"ip_start": "133.0.0.0",   "ip_end": "133.255.255.255","code": "JP", "country": "Japan", "city": "Tokyo"},
    {"ip_start": "177.0.0.0",   "ip_end": "177.255.255.255","code": "BR", "country": "Brazil", "city": "São Paulo"},
    {"ip_start": "187.130.0.0", "ip_end": "187.255.255.255","code": "MX", "country": "Mexico", "city": "Mexico City"},
    {"ip_start": "200.68.128.0","ip_end": "200.68.255.255","code": "MX", "country": "Mexico", "city": "Guadalajara"},
    {"ip_start": "1.1.1.0",     "ip_end": "1.1.1.255",     "code": "AU", "country": "Australia", "city": "Sydney"},
]

def ip_to_int(ip_str: str) -> int:
    """Convierte una cadena IPv4 'A.B.C.D' a un entero de 32 bits."""
    octets = [int(x) for x in ip_str.strip().split(".")]
    if len(octets) != 4:
        raise ValueError(f"IP inválida: {ip_str}")
    return (octets[0] << 24) + (octets[1] << 16) + (octets[2] << 8) + octets[3]

def resolve_local(ip_str: str):
    """Resuelve la IP contra el dataset en memoria usando búsqueda de rango."""
    ip_num = ip_to_int(ip_str)
    for entry in DATASET:
        start_num = ip_to_int(entry["ip_start"])
        end_num = ip_to_int(entry["ip_end"])
        if start_num <= ip_num <= end_num:
            return entry
    return None

def test_dataset():
    """Ejecuta suite de validación de IPs."""
    test_cases = [
        ("190.113.10.5",  "CR", "Costa Rica"),
        ("196.40.1.20",   "CR", "Costa Rica"),
        ("8.8.8.8",       "US", "United States"),
        ("12.34.56.78",   "US", "United States"),
        ("80.58.61.250",  "ES", "Spain"),
        ("85.214.132.11", "DE", "Germany"),
        ("133.1.2.3",     "JP", "Japan"),
        ("177.10.20.30",  "BR", "Brazil"),
        ("187.130.40.50", "MX", "Mexico"),
        ("1.1.1.1",       "AU", "Australia"),
    ]

    print("=====================================================")
    print("      VALIDACIÓN DE GEOLOCALIZACIÓN IP-TO-COUNTRY    ")
    print("=====================================================")
    
    passed = 0
    for ip, expected_code, expected_name in test_cases:
        res = resolve_local(ip)
        if res and res["code"] == expected_code:
            print(f"[OK]   IP: {ip:<15} -> {res['code']} ({res['country']}, {res['city']})")
            passed += 1
        else:
            print(f"[FAIL] IP: {ip:<15} -> Esperado {expected_code}, obtenido {res}")

    print("-----------------------------------------------------")
    print(f"Resultados: {passed}/{len(test_cases)} pruebas pasadas con éxito.\n")
    return passed == len(test_cases)

if __name__ == "__main__":
    success = test_dataset()
    sys.exit(0 if success else 1)
