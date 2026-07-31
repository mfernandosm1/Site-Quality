import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

const DATABASE_VERSION = '2.2.0';
const EMPTY_DATABASE = {
  version: DATABASE_VERSION,
  updatedAt: null,
  devices: [],
  caseCompatibility: [],
  screenCompatibility: []
};

const BUILT_IN_DEVICE_CATALOG = [{"id":"device_seed_iphone_6","name":"iPhone 6","aliases":["iPhone6"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_6_plus","name":"iPhone 6 Plus","aliases":["iPhone6 Plus"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_6s","name":"iPhone 6s","aliases":["iPhone6s"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_6s_plus","name":"iPhone 6s Plus","aliases":["iPhone6s Plus"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_7","name":"iPhone 7","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_7_plus","name":"iPhone 7 Plus","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_8","name":"iPhone 8","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_8_plus","name":"iPhone 8 Plus","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_x","name":"iPhone X","aliases":["iPhone 10"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_xr","name":"iPhone XR","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_xs","name":"iPhone XS","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_xs_max","name":"iPhone XS Max","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_11","name":"iPhone 11","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_11_pro","name":"iPhone 11 Pro","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_11_pro_max","name":"iPhone 11 Pro Max","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_se_2020","name":"iPhone SE 2020","aliases":["iPhone SE 2ª geração","iPhone SE 2"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_12_mini","name":"iPhone 12 Mini","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_12","name":"iPhone 12","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_12_pro","name":"iPhone 12 Pro","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_12_pro_max","name":"iPhone 12 Pro Max","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_13_mini","name":"iPhone 13 Mini","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_13","name":"iPhone 13","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_13_pro","name":"iPhone 13 Pro","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_13_pro_max","name":"iPhone 13 Pro Max","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_se_2022","name":"iPhone SE 2022","aliases":["iPhone SE 3ª geração","iPhone SE 3"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_14","name":"iPhone 14","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_14_plus","name":"iPhone 14 Plus","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_14_pro","name":"iPhone 14 Pro","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_14_pro_max","name":"iPhone 14 Pro Max","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_15","name":"iPhone 15","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_15_plus","name":"iPhone 15 Plus","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_15_pro","name":"iPhone 15 Pro","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_15_pro_max","name":"iPhone 15 Pro Max","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_16e","name":"iPhone 16e","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_16","name":"iPhone 16","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_16_plus","name":"iPhone 16 Plus","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_16_pro","name":"iPhone 16 Pro","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_iphone_16_pro_max","name":"iPhone 16 Pro Max","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a03_core","name":"Samsung Galaxy A03 Core","aliases":["A03 Core"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a03","name":"Samsung Galaxy A03","aliases":["A03"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a03s","name":"Samsung Galaxy A03s","aliases":["A03s"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a04","name":"Samsung Galaxy A04","aliases":["A04"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a04e","name":"Samsung Galaxy A04e","aliases":["A04e"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a04s","name":"Samsung Galaxy A04s","aliases":["A04s"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a05","name":"Samsung Galaxy A05","aliases":["A05"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a05s","name":"Samsung Galaxy A05s","aliases":["A05s"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a06","name":"Samsung Galaxy A06","aliases":["A06"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a10","name":"Samsung Galaxy A10","aliases":["A10"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a10s","name":"Samsung Galaxy A10s","aliases":["A10s"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a11","name":"Samsung Galaxy A11","aliases":["A11"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a12","name":"Samsung Galaxy A12","aliases":["A12"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a13_4g","name":"Samsung Galaxy A13 4G","aliases":["A13"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a13_5g","name":"Samsung Galaxy A13 5G","aliases":["A13 5G"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a14_4g","name":"Samsung Galaxy A14 4G","aliases":["A14"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a14_5g","name":"Samsung Galaxy A14 5G","aliases":["A14 5G"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a15_4g","name":"Samsung Galaxy A15 4G","aliases":["A15","SM-A155"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a15_5g","name":"Samsung Galaxy A15 5G","aliases":["A15 5G","SM-A156"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a16_4g","name":"Samsung Galaxy A16 4G","aliases":["A16"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a16_5g","name":"Samsung Galaxy A16 5G","aliases":["A16 5G"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a20","name":"Samsung Galaxy A20","aliases":["A20"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a20s","name":"Samsung Galaxy A20s","aliases":["A20s"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a21s","name":"Samsung Galaxy A21s","aliases":["A21s"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a22_4g","name":"Samsung Galaxy A22 4G","aliases":["A22"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a22_5g","name":"Samsung Galaxy A22 5G","aliases":["A22 5G"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a23_4g","name":"Samsung Galaxy A23 4G","aliases":["A23"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a23_5g","name":"Samsung Galaxy A23 5G","aliases":["A23 5G"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a24_4g","name":"Samsung Galaxy A24 4G","aliases":["A24"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a25_5g","name":"Samsung Galaxy A25 5G","aliases":["A25"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a26_5g","name":"Samsung Galaxy A26 5G","aliases":["A26"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a30","name":"Samsung Galaxy A30","aliases":["A30"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a30s","name":"Samsung Galaxy A30s","aliases":["A30s"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a31","name":"Samsung Galaxy A31","aliases":["A31"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a32_4g","name":"Samsung Galaxy A32 4G","aliases":["A32"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a32_5g","name":"Samsung Galaxy A32 5G","aliases":["A32 5G"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a33_5g","name":"Samsung Galaxy A33 5G","aliases":["A33"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a34_5g","name":"Samsung Galaxy A34 5G","aliases":["A34"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a35_5g","name":"Samsung Galaxy A35 5G","aliases":["A35"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a36_5g","name":"Samsung Galaxy A36 5G","aliases":["A36"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a50","name":"Samsung Galaxy A50","aliases":["A50"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a50s","name":"Samsung Galaxy A50s","aliases":["A50s"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a51","name":"Samsung Galaxy A51","aliases":["A51"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a52","name":"Samsung Galaxy A52","aliases":["A52"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a52s_5g","name":"Samsung Galaxy A52s 5G","aliases":["A52s"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a53_5g","name":"Samsung Galaxy A53 5G","aliases":["A53"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a54_5g","name":"Samsung Galaxy A54 5G","aliases":["A54"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a55_5g","name":"Samsung Galaxy A55 5G","aliases":["A55"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a56_5g","name":"Samsung Galaxy A56 5G","aliases":["A56"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a70","name":"Samsung Galaxy A70","aliases":["A70"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a71","name":"Samsung Galaxy A71","aliases":["A71"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a72","name":"Samsung Galaxy A72","aliases":["A72"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_a73_5g","name":"Samsung Galaxy A73 5G","aliases":["A73"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_m12","name":"Samsung Galaxy M12","aliases":["M12"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_m13","name":"Samsung Galaxy M13","aliases":["M13"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_m14_5g","name":"Samsung Galaxy M14 5G","aliases":["M14"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_m15_5g","name":"Samsung Galaxy M15 5G","aliases":["M15"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_m23_5g","name":"Samsung Galaxy M23 5G","aliases":["M23"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_m34_5g","name":"Samsung Galaxy M34 5G","aliases":["M34"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_m35_5g","name":"Samsung Galaxy M35 5G","aliases":["M35"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_m53_5g","name":"Samsung Galaxy M53 5G","aliases":["M53"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_m54_5g","name":"Samsung Galaxy M54 5G","aliases":["M54"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_m55_5g","name":"Samsung Galaxy M55 5G","aliases":["M55"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s20_fe","name":"Samsung Galaxy S20 FE","aliases":["S20 FE"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s21_fe","name":"Samsung Galaxy S21 FE","aliases":["S21 FE"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s23_fe","name":"Samsung Galaxy S23 FE","aliases":["S23 FE"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s24_fe","name":"Samsung Galaxy S24 FE","aliases":["S24 FE"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s25_fe","name":"Samsung Galaxy S25 FE","aliases":["S25 FE"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s21","name":"Samsung Galaxy S21","aliases":["S21"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s21_plus","name":"Samsung Galaxy S21 Plus","aliases":["S21+"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s21_ultra","name":"Samsung Galaxy S21 Ultra","aliases":["S21 Ultra"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s22","name":"Samsung Galaxy S22","aliases":["S22"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s22_plus","name":"Samsung Galaxy S22 Plus","aliases":["S22+"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s22_ultra","name":"Samsung Galaxy S22 Ultra","aliases":["S22 Ultra"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s23","name":"Samsung Galaxy S23","aliases":["S23"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s23_plus","name":"Samsung Galaxy S23 Plus","aliases":["S23+"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s23_ultra","name":"Samsung Galaxy S23 Ultra","aliases":["S23 Ultra"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s24","name":"Samsung Galaxy S24","aliases":["S24"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s24_plus","name":"Samsung Galaxy S24 Plus","aliases":["S24+"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s24_ultra","name":"Samsung Galaxy S24 Ultra","aliases":["S24 Ultra"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s25","name":"Samsung Galaxy S25","aliases":["S25"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s25_plus","name":"Samsung Galaxy S25 Plus","aliases":["S25+"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_s25_ultra","name":"Samsung Galaxy S25 Ultra","aliases":["S25 Ultra"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_z_flip_4","name":"Samsung Galaxy Z Flip 4","aliases":["Z Flip4"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_z_flip_5","name":"Samsung Galaxy Z Flip 5","aliases":["Z Flip5"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_z_flip_6","name":"Samsung Galaxy Z Flip 6","aliases":["Z Flip6"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_z_fold_4","name":"Samsung Galaxy Z Fold 4","aliases":["Z Fold4"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_z_fold_5","name":"Samsung Galaxy Z Fold 5","aliases":["Z Fold5"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_samsung_galaxy_z_fold_6","name":"Samsung Galaxy Z Fold 6","aliases":["Z Fold6"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_e6i","name":"Motorola Moto E6i","aliases":["E6i"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_e7","name":"Motorola Moto E7","aliases":["E7"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_e7_plus","name":"Motorola Moto E7 Plus","aliases":["E7 Plus"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_e13","name":"Motorola Moto E13","aliases":["E13"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_e14","name":"Motorola Moto E14","aliases":["E14"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_e20","name":"Motorola Moto E20","aliases":["E20"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_e22","name":"Motorola Moto E22","aliases":["E22"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_e22i","name":"Motorola Moto E22i","aliases":["E22i"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_e32","name":"Motorola Moto E32","aliases":["E32"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_e32s","name":"Motorola Moto E32s","aliases":["E32s"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_e40","name":"Motorola Moto E40","aliases":["E40"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g04","name":"Motorola Moto G04","aliases":["G04"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g04s","name":"Motorola Moto G04s","aliases":["G04s"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g05","name":"Motorola Moto G05","aliases":["G05"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g14","name":"Motorola Moto G14","aliases":["G14"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g15","name":"Motorola Moto G15","aliases":["G15"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g20","name":"Motorola Moto G20","aliases":["G20"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g22","name":"Motorola Moto G22","aliases":["G22"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g23","name":"Motorola Moto G23","aliases":["G23"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g24","name":"Motorola Moto G24","aliases":["G24"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g24_power","name":"Motorola Moto G24 Power","aliases":["G24 Power"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g30","name":"Motorola Moto G30","aliases":["G30"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g31","name":"Motorola Moto G31","aliases":["G31"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g32","name":"Motorola Moto G32","aliases":["G32"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g34_5g","name":"Motorola Moto G34 5G","aliases":["G34"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g35_5g","name":"Motorola Moto G35 5G","aliases":["G35"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g41","name":"Motorola Moto G41","aliases":["G41"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g42","name":"Motorola Moto G42","aliases":["G42"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g52","name":"Motorola Moto G52","aliases":["G52"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g53_5g","name":"Motorola Moto G53 5G","aliases":["G53"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g54_5g","name":"Motorola Moto G54 5G","aliases":["G54"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g55_5g","name":"Motorola Moto G55 5G","aliases":["G55"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g60","name":"Motorola Moto G60","aliases":["G60"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g60s","name":"Motorola Moto G60s","aliases":["G60s"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g62_5g","name":"Motorola Moto G62 5G","aliases":["G62"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g71_5g","name":"Motorola Moto G71 5G","aliases":["G71"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g72","name":"Motorola Moto G72","aliases":["G72"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g73_5g","name":"Motorola Moto G73 5G","aliases":["G73"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g75_5g","name":"Motorola Moto G75 5G","aliases":["G75"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g84_5g","name":"Motorola Moto G84 5G","aliases":["G84"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g85_5g","name":"Motorola Moto G85 5G","aliases":["G85"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g100","name":"Motorola Moto G100","aliases":["G100"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_g200_5g","name":"Motorola Moto G200 5G","aliases":["G200"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_20","name":"Motorola Moto Edge 20","aliases":["Edge 20"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_20_lite","name":"Motorola Moto Edge 20 Lite","aliases":["Edge 20 Lite"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_20_pro","name":"Motorola Moto Edge 20 Pro","aliases":["Edge 20 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_30","name":"Motorola Moto Edge 30","aliases":["Edge 30"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_30_neo","name":"Motorola Moto Edge 30 Neo","aliases":["Edge 30 Neo"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_30_fusion","name":"Motorola Moto Edge 30 Fusion","aliases":["Edge 30 Fusion"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_30_pro","name":"Motorola Moto Edge 30 Pro","aliases":["Edge 30 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_40","name":"Motorola Moto Edge 40","aliases":["Edge 40"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_40_neo","name":"Motorola Moto Edge 40 Neo","aliases":["Edge 40 Neo"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_40_pro","name":"Motorola Moto Edge 40 Pro","aliases":["Edge 40 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_50","name":"Motorola Moto Edge 50","aliases":["Edge 50"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_50_fusion","name":"Motorola Moto Edge 50 Fusion","aliases":["Edge 50 Fusion"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_50_neo","name":"Motorola Moto Edge 50 Neo","aliases":["Edge 50 Neo"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_50_pro","name":"Motorola Moto Edge 50 Pro","aliases":["Edge 50 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_50_ultra","name":"Motorola Moto Edge 50 Ultra","aliases":["Edge 50 Ultra"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_60","name":"Motorola Moto Edge 60","aliases":["Edge 60"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_60_fusion","name":"Motorola Moto Edge 60 Fusion","aliases":["Edge 60 Fusion"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_edge_60_pro","name":"Motorola Moto Edge 60 Pro","aliases":["Edge 60 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_razr_40","name":"Motorola Moto Razr 40","aliases":["Razr 40"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_razr_40_ultra","name":"Motorola Moto Razr 40 Ultra","aliases":["Razr 40 Ultra"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_razr_50","name":"Motorola Moto Razr 50","aliases":["Razr 50"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_motorola_moto_razr_50_ultra","name":"Motorola Moto Razr 50 Ultra","aliases":["Razr 50 Ultra"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_9a","name":"Xiaomi Redmi 9A","aliases":["9A"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_9c","name":"Xiaomi Redmi 9C","aliases":["9C"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_9","name":"Xiaomi Redmi 9","aliases":["Redmi 9"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_10","name":"Xiaomi Redmi 10","aliases":["Redmi 10"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_10c","name":"Xiaomi Redmi 10C","aliases":["10C"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_12","name":"Xiaomi Redmi 12","aliases":["Redmi 12"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_12c","name":"Xiaomi Redmi 12C","aliases":["12C"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_13","name":"Xiaomi Redmi 13","aliases":["Redmi 13"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_13c","name":"Xiaomi Redmi 13C","aliases":["13C"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_14c","name":"Xiaomi Redmi 14C","aliases":["14C"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_15c","name":"Xiaomi Redmi 15C","aliases":["15C"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_9","name":"Xiaomi Redmi Note 9","aliases":["RN9"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_9s","name":"Xiaomi Redmi Note 9S","aliases":["RN9S"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_9_pro","name":"Xiaomi Redmi Note 9 Pro","aliases":["RN9 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_10","name":"Xiaomi Redmi Note 10","aliases":["RN10"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_10s","name":"Xiaomi Redmi Note 10S","aliases":["RN10S"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_10_pro","name":"Xiaomi Redmi Note 10 Pro","aliases":["RN10 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_11","name":"Xiaomi Redmi Note 11","aliases":["RN11"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_11s","name":"Xiaomi Redmi Note 11S","aliases":["RN11S"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_11_pro","name":"Xiaomi Redmi Note 11 Pro","aliases":["RN11 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_12_4g","name":"Xiaomi Redmi Note 12 4G","aliases":["RN12"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_12_5g","name":"Xiaomi Redmi Note 12 5G","aliases":["RN12 5G"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_12_pro_5g","name":"Xiaomi Redmi Note 12 Pro 5G","aliases":["RN12 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_13_4g","name":"Xiaomi Redmi Note 13 4G","aliases":["RN13"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_13_5g","name":"Xiaomi Redmi Note 13 5G","aliases":["RN13 5G"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_13_pro_4g","name":"Xiaomi Redmi Note 13 Pro 4G","aliases":["RN13 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_13_pro_5g","name":"Xiaomi Redmi Note 13 Pro 5G","aliases":["RN13 Pro 5G"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_13_pro_plus_5g","name":"Xiaomi Redmi Note 13 Pro Plus 5G","aliases":["RN13 Pro+"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_14_4g","name":"Xiaomi Redmi Note 14 4G","aliases":["RN14"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_14_5g","name":"Xiaomi Redmi Note 14 5G","aliases":["RN14 5G"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_14_pro_4g","name":"Xiaomi Redmi Note 14 Pro 4G","aliases":["RN14 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_14_pro_5g","name":"Xiaomi Redmi Note 14 Pro 5G","aliases":["RN14 Pro 5G"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_14_pro_plus_5g","name":"Xiaomi Redmi Note 14 Pro Plus 5G","aliases":["RN14 Pro+"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_15_4g","name":"Xiaomi Redmi Note 15 4G","aliases":["RN15"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_15_5g","name":"Xiaomi Redmi Note 15 5G","aliases":["RN15 5G"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_15_pro_5g","name":"Xiaomi Redmi Note 15 Pro 5G","aliases":["RN15 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_redmi_note_15_pro_plus_5g","name":"Xiaomi Redmi Note 15 Pro Plus 5G","aliases":["RN15 Pro+"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_c40","name":"Xiaomi POCO C40","aliases":["C40"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_c55","name":"Xiaomi POCO C55","aliases":["C55"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_c65","name":"Xiaomi POCO C65","aliases":["C65"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_c75","name":"Xiaomi POCO C75","aliases":["C75"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_m4_pro","name":"Xiaomi POCO M4 Pro","aliases":["M4 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_m5","name":"Xiaomi POCO M5","aliases":["M5"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_m5s","name":"Xiaomi POCO M5s","aliases":["M5s"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_m6_pro","name":"Xiaomi POCO M6 Pro","aliases":["M6 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_m7_pro","name":"Xiaomi POCO M7 Pro","aliases":["M7 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_x3_nfc","name":"Xiaomi POCO X3 NFC","aliases":["X3 NFC"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_x3_pro","name":"Xiaomi POCO X3 Pro","aliases":["X3 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_x4_pro_5g","name":"Xiaomi POCO X4 Pro 5G","aliases":["X4 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_x5_5g","name":"Xiaomi POCO X5 5G","aliases":["X5"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_x5_pro_5g","name":"Xiaomi POCO X5 Pro 5G","aliases":["X5 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_x6_5g","name":"Xiaomi POCO X6 5G","aliases":["X6"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_x6_pro_5g","name":"Xiaomi POCO X6 Pro 5G","aliases":["X6 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_x7_5g","name":"Xiaomi POCO X7 5G","aliases":["X7"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_x7_pro_5g","name":"Xiaomi POCO X7 Pro 5G","aliases":["X7 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_x8_pro_5g","name":"Xiaomi POCO X8 Pro 5G","aliases":["X8 Pro"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_poco_x8_pro_max_5g","name":"Xiaomi POCO X8 Pro Max 5G","aliases":["X8 Pro Max"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_12","name":"Xiaomi 12","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_12_lite","name":"Xiaomi 12 Lite","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_13","name":"Xiaomi 13","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_13_lite","name":"Xiaomi 13 Lite","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_14","name":"Xiaomi 14","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_14t","name":"Xiaomi 14T","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_14t_pro","name":"Xiaomi 14T Pro","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_15","name":"Xiaomi 15","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_xiaomi_15_ultra","name":"Xiaomi 15 Ultra","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_realme_c30","name":"Realme C30","aliases":["C30"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_realme_c35","name":"Realme C35","aliases":["C35"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_realme_c53","name":"Realme C53","aliases":["C53"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_realme_c55","name":"Realme C55","aliases":["C55"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_realme_c61","name":"Realme C61","aliases":["C61"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_realme_c63","name":"Realme C63","aliases":["C63"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_realme_c67","name":"Realme C67","aliases":["C67"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_realme_c75","name":"Realme C75","aliases":["C75"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_realme_11","name":"Realme 11","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_realme_12","name":"Realme 12","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_realme_12_plus_5g","name":"Realme 12 Plus 5G","aliases":["12+"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_realme_13_plus_5g","name":"Realme 13 Plus 5G","aliases":["13+"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_realme_gt_6","name":"Realme GT 6","aliases":["GT6"],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_infinix_smart_7","name":"Infinix Smart 7","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_infinix_smart_8","name":"Infinix Smart 8","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_infinix_smart_9","name":"Infinix Smart 9","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_infinix_hot_30","name":"Infinix Hot 30","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_infinix_hot_40i","name":"Infinix Hot 40i","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_infinix_hot_50i","name":"Infinix Hot 50i","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_infinix_note_30","name":"Infinix Note 30","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_infinix_note_40","name":"Infinix Note 40","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"},{"id":"device_seed_infinix_note_40_pro","name":"Infinix Note 40 Pro","aliases":[],"notes":"","active":true,"integrations":{"productIds":[],"stockItemIds":[]},"source":"catalog_quality_v2"}];

function cloneBuiltInCatalog() {
  return BUILT_IN_DEVICE_CATALOG.map((device) => ({
    ...device,
    aliases: [...(device.aliases || [])],
    integrations: { productIds: [], stockItemIds: [] }
  }));
}


const BRAND_ORDER = ['Apple', 'Samsung', 'Motorola', 'Xiaomi', 'Redmi', 'POCO', 'Realme', 'Infinix', 'Honor', 'ASUS', 'Google', 'Nokia', 'TCL', 'Huawei', 'LG', 'Outros'];

function deviceBrand(device = {}) {
  const name = deviceName(device);
  const normalized = normalizeText(name);
  if (normalized.startsWith('iphone')) return 'Apple';
  if (normalized.startsWith('samsung ')) return 'Samsung';
  if (normalized.startsWith('motorola ')) return 'Motorola';
  if (normalized.startsWith('xiaomi redmi ')) return 'Redmi';
  if (normalized.startsWith('xiaomi poco ')) return 'POCO';
  if (normalized.startsWith('xiaomi ')) return 'Xiaomi';
  if (normalized.startsWith('redmi ')) return 'Redmi';
  if (normalized.startsWith('poco ')) return 'POCO';
  if (normalized.startsWith('realme ')) return 'Realme';
  if (normalized.startsWith('infinix ')) return 'Infinix';
  if (normalized.startsWith('honor ')) return 'Honor';
  if (normalized.startsWith('asus ')) return 'ASUS';
  if (normalized.startsWith('google ')) return 'Google';
  if (normalized.startsWith('nokia ')) return 'Nokia';
  if (normalized.startsWith('tcl ')) return 'TCL';
  if (normalized.startsWith('huawei ')) return 'Huawei';
  if (normalized.startsWith('lg ')) return 'LG';
  return String(name).split(/\s+/)[0] || 'Outros';
}

function brandRank(brand) {
  const index = BRAND_ORDER.indexOf(brand);
  return index === -1 ? BRAND_ORDER.length : index;
}

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseAliases(value = '') {
  const aliases = Array.isArray(value) ? value : String(value).split(/[,;\n]/);
  return [...new Set(aliases.map((item) => String(item).trim()).filter(Boolean))];
}

function uniqueId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function databasePath(req) {
  return path.join(req.app.locals.paths.CONTENT_DIR, 'compatibility.json');
}

function productsPath(req) {
  return path.join(req.app.locals.paths.CONTENT_DIR, 'products.json');
}

function ensureDatabase(req) {
  const filePath = databasePath(req);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ ...EMPTY_DATABASE, catalogVersion: '2026.07', devices: cloneBuiltInCatalog() }, null, 2), 'utf8');
  }
  return filePath;
}

function deviceName(device = {}) {
  if (device.name) return String(device.name).trim();
  return [device.brand, device.model, device.variant].filter(Boolean).join(' ').trim();
}

function normalizeDevice(device = {}) {
  const name = deviceName(device);
  return {
    ...device,
    id: device.id || uniqueId('device'),
    name,
    brand: device.brand || deviceBrand({ ...device, name }),
    aliases: parseAliases(device.aliases),
    notes: String(device.notes || '').trim(),
    searchText: normalizeText([name, ...(device.aliases || [])].join(' ')),
    active: device.active !== false,
    integrations: {
      productIds: Array.isArray(device.integrations?.productIds) ? device.integrations.productIds.map(String) : [],
      stockItemIds: Array.isArray(device.integrations?.stockItemIds) ? device.integrations.stockItemIds.map(String) : [],
      ...(device.integrations || {})
    }
  };
}

function normalizeRelation(relation = {}) {
  return {
    ...relation,
    targetDeviceId: relation.targetDeviceId ? String(relation.targetDeviceId) : null,
    productId: relation.productId ? String(relation.productId) : null,
    label: String(relation.label || '').trim(),
    status: ['verified', 'suggested', 'manual'].includes(relation.status) ? relation.status : 'verified',
    notes: String(relation.notes || '').trim(),
    active: relation.active !== false
  };
}

function readDatabase(req) {
  const filePath = ensureDatabase(req);
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      ...EMPTY_DATABASE,
      ...parsed,
      version: DATABASE_VERSION,
      devices: Array.isArray(parsed.devices) && parsed.devices.length ? parsed.devices.map(normalizeDevice) : cloneBuiltInCatalog().map(normalizeDevice),
      caseCompatibility: Array.isArray(parsed.caseCompatibility) ? parsed.caseCompatibility.map(normalizeRelation) : [],
      screenCompatibility: Array.isArray(parsed.screenCompatibility) ? parsed.screenCompatibility.map(normalizeRelation) : []
    };
  } catch (error) {
    console.error('[Compatibilidade] Falha ao ler a base:', error);
    return structuredClone(EMPTY_DATABASE);
  }
}

function createBackup(req, filePath) {
  if (!fs.existsSync(filePath)) return;
  const backupRoot = path.join(req.app.locals.paths.BACKUPS_DIR, 'compatibilidade');
  fs.mkdirSync(backupRoot, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(filePath, path.join(backupRoot, `compatibility-${stamp}.json`));
}

function writeDatabase(req, database) {
  const filePath = ensureDatabase(req);
  createBackup(req, filePath);
  const next = {
    ...database,
    version: DATABASE_VERSION,
    updatedAt: new Date().toISOString(),
    devices: database.devices.map(normalizeDevice)
  };
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(temporaryPath, filePath);
}

function readProducts(req) {
  try {
    const parsed = JSON.parse(fs.readFileSync(productsPath(req), 'utf8'));
    const items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.items) ? parsed.items : []);
    return items
      .filter((item) => item && item.active !== false)
      .map((item) => ({
        id: String(item.id),
        name: item.name || item.title || 'Produto sem nome',
        category: item.category || '',
        stock: item.stock ?? item.quantity ?? null,
        active: item.active !== false
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('[Compatibilidade] Falha ao ler produtos:', error);
    return [];
  }
}

function typeConfig(rawType) {
  if (['peliculas', 'screen', 'screen_protector'].includes(rawType)) {
    return { key: 'peliculas', collection: 'screenCompatibility', singular: 'película', title: 'Películas', icon: '🛡️' };
  }
  return { key: 'capas', collection: 'caseCompatibility', singular: 'capa', title: 'Capas', icon: '📱' };
}

function redirectWith(req, res, params = {}) {
  const currentType = typeConfig(req.body.type || req.query.tipo).key;
  const query = new URLSearchParams({ tipo: currentType, ...params });
  return res.redirect(`/compatibilidade?${query.toString()}`);
}

function relationKey(relation) {
  return relation.productId ? `product:${relation.productId}` : `label:${normalizeText(relation.label)}`;
}

router.get('/', (req, res) => {
  const database = readDatabase(req);
  const products = readProducts(req);
  const selectedType = typeConfig(req.query.tipo);
  const search = String(req.query.q || '').trim();
  const normalizedSearch = normalizeText(search);
  const tokens = normalizedSearch.split(' ').filter(Boolean);

  const allDevices = database.devices
    .filter((device) => device.active !== false)
    .sort((a, b) => {
      const rank = brandRank(a.brand) - brandRank(b.brand);
      if (rank !== 0) return rank;
      const brandCompare = String(a.brand).localeCompare(String(b.brand), 'pt-BR');
      return brandCompare || a.name.localeCompare(b.name, 'pt-BR', { numeric: true });
    });

  const deviceGroups = [];
  const groupMap = new Map();
  for (const device of allDevices) {
    const brand = device.brand || deviceBrand(device);
    if (!groupMap.has(brand)) {
      const group = { brand, devices: [] };
      groupMap.set(brand, group);
      deviceGroups.push(group);
    }
    groupMap.get(brand).devices.push(device);
  }

  const devices = allDevices.filter((device) => {
    if (!tokens.length) return true;
    return tokens.every((token) => device.searchText.includes(token));
  });

  const requestedDeviceId = String(req.query.device || '');
  const selectedDevice = allDevices.find((device) => String(device.id) === requestedDeviceId)
    || (devices.length === 1 ? devices[0] : null);

  const productMap = new Map(products.map((product) => [product.id, product]));
  const relations = selectedDevice
    ? database[selectedType.collection]
      .filter((relation) => String(relation.deviceId) === String(selectedDevice.id) && relation.active !== false)
      .map((relation) => ({ ...relation, product: relation.productId ? productMap.get(String(relation.productId)) || null : null }))
      .sort((a, b) => String(a.product?.name || a.label).localeCompare(String(b.product?.name || b.label), 'pt-BR'))
    : [];

  res.render('compatibilidade', {
    flash: req.query.flash || null,
    error: req.query.error || null,
    database,
    devices,
    allDevices,
    deviceGroups,
    products,
    selectedType,
    selectedDevice,
    relations,
    search
  });
});

router.post('/aparelhos', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return redirectWith(req, res, { error: 'Informe o nome do aparelho.' });

  const database = readDatabase(req);
  const duplicate = database.devices.find((device) => device.active !== false && normalizeText(device.name) === normalizeText(name));
  if (duplicate) return redirectWith(req, res, { device: duplicate.id, error: 'Este aparelho já está cadastrado.' });

  const now = new Date().toISOString();
  const device = normalizeDevice({
    id: uniqueId('device'),
    name,
    brand: deviceBrand({ name }),
    aliases: parseAliases(req.body.aliases),
    notes: String(req.body.notes || '').trim(),
    active: true,
    integrations: { productIds: [], stockItemIds: [] },
    createdAt: now,
    updatedAt: now
  });

  database.devices.push(device);
  writeDatabase(req, database);
  return redirectWith(req, res, { device: device.id, flash: 'Aparelho cadastrado.' });
});

router.post('/aparelhos/:id/editar', (req, res) => {
  const database = readDatabase(req);
  const device = database.devices.find((item) => String(item.id) === String(req.params.id));
  if (!device) return redirectWith(req, res, { error: 'Aparelho não encontrado.' });

  const name = String(req.body.name || '').trim();
  if (!name) return redirectWith(req, res, { device: device.id, error: 'Informe o nome do aparelho.' });

  const duplicate = database.devices.find((item) => item.active !== false && String(item.id) !== String(device.id) && normalizeText(item.name) === normalizeText(name));
  if (duplicate) return redirectWith(req, res, { device: duplicate.id, error: 'Já existe outro aparelho com este nome.' });

  Object.assign(device, normalizeDevice({
    ...device,
    name,
    brand: device.brand || deviceBrand({ ...device, name }),
    aliases: parseAliases(req.body.aliases),
    notes: String(req.body.notes || '').trim(),
    updatedAt: new Date().toISOString()
  }));

  writeDatabase(req, database);
  return redirectWith(req, res, { device: device.id, flash: 'Aparelho atualizado.' });
});

router.post('/aparelhos/:id/arquivar', (req, res) => {
  const database = readDatabase(req);
  const device = database.devices.find((item) => String(item.id) === String(req.params.id));
  if (!device) return redirectWith(req, res, { error: 'Aparelho não encontrado.' });
  device.active = false;
  device.updatedAt = new Date().toISOString();
  writeDatabase(req, database);
  return redirectWith(req, res, { flash: 'Aparelho arquivado. Os vínculos foram preservados.' });
});

router.post('/relacoes', (req, res) => {
  const database = readDatabase(req);
  const selectedType = typeConfig(req.body.type);
  const device = database.devices.find((item) => String(item.id) === String(req.body.deviceId) && item.active !== false);
  if (!device) return redirectWith(req, res, { error: 'Selecione um aparelho válido.' });

  const productId = String(req.body.productId || '').trim() || null;
  const label = String(req.body.label || '').trim();
  if (!productId && !label) {
    return redirectWith(req, res, { device: device.id, error: `Informe a ${selectedType.singular} compatível.` });
  }

  const collection = database[selectedType.collection];
  const candidate = { productId, label };
  const duplicate = collection.find((item) => String(item.deviceId) === String(device.id) && item.active !== false && relationKey(item) === relationKey(candidate));
  if (duplicate) return redirectWith(req, res, { device: device.id, error: 'Esta compatibilidade já está cadastrada.' });

  const now = new Date().toISOString();
  collection.push(normalizeRelation({
    id: uniqueId(selectedType.key === 'capas' ? 'case' : 'screen'),
    deviceId: device.id,
    productId,
    label,
    status: req.body.status,
    notes: req.body.notes,
    active: true,
    createdAt: now,
    updatedAt: now
  }));

  writeDatabase(req, database);
  return redirectWith(req, res, { device: device.id, flash: 'Compatibilidade adicionada.' });
});

router.post('/relacoes/:id/remover', (req, res) => {
  const database = readDatabase(req);
  const selectedType = typeConfig(req.body.type);
  const relation = database[selectedType.collection].find((item) => String(item.id) === String(req.params.id));
  if (!relation) return redirectWith(req, res, { error: 'Compatibilidade não encontrada.' });
  relation.active = false;
  relation.updatedAt = new Date().toISOString();
  writeDatabase(req, database);
  return redirectWith(req, res, { device: relation.deviceId, flash: 'Compatibilidade removida.' });
});

router.post('/duplicar', (req, res) => {
  const database = readDatabase(req);
  const selectedType = typeConfig(req.body.type);
  const targetDeviceId = String(req.body.targetDeviceId || '');
  const sourceDeviceId = String(req.body.sourceDeviceId || '');

  if (!targetDeviceId || !sourceDeviceId || targetDeviceId === sourceDeviceId) {
    return redirectWith(req, res, { device: targetDeviceId, error: 'Escolha outro aparelho como origem.' });
  }

  const activeIds = new Set(database.devices.filter((item) => item.active !== false).map((item) => String(item.id)));
  if (!activeIds.has(targetDeviceId) || !activeIds.has(sourceDeviceId)) {
    return redirectWith(req, res, { device: targetDeviceId, error: 'Aparelho de origem ou destino não encontrado.' });
  }

  const collection = database[selectedType.collection];
  const targetKeys = new Set(collection
    .filter((item) => String(item.deviceId) === targetDeviceId && item.active !== false)
    .map(relationKey));

  let copied = 0;
  for (const source of collection.filter((item) => String(item.deviceId) === sourceDeviceId && item.active !== false)) {
    const key = relationKey(source);
    if (targetKeys.has(key)) continue;
    const now = new Date().toISOString();
    collection.push({
      ...source,
      id: uniqueId(selectedType.key === 'capas' ? 'case' : 'screen'),
      deviceId: targetDeviceId,
      status: 'manual',
      createdAt: now,
      updatedAt: now
    });
    targetKeys.add(key);
    copied += 1;
  }

  writeDatabase(req, database);
  return redirectWith(req, res, {
    device: targetDeviceId,
    flash: copied ? `${copied} compatibilidade(s) copiada(s) para revisão.` : 'Nenhuma compatibilidade nova para copiar.'
  });
});

export default router;
