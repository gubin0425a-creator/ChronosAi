#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);
Adafruit_MPU6050 mpu;

String gerakanSebelumnya = "";

void setup() {
  Serial.begin(115200); 

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Sistem Sholat");
  lcd.setCursor(0, 1);
  lcd.print("Inisialisasi...");

  if (!mpu.begin()) {
    Serial.println("Error: Sensor MPU6050 tidak ditemukan!");
    lcd.clear();
    lcd.print("Error MPU6050!");
    while (1) { delay(10); }
  }

  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  
  delay(2000);
  lcd.clear();
  lcd.print("Menunggu Node.js");
}

void loop() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  float pitch = atan2(a.acceleration.x, sqrt(a.acceleration.y * a.acceleration.y + a.acceleration.z * a.acceleration.z)) * 180.0 / PI;
  
  String gerakan = "Transisi";
  if (pitch >= -10 && pitch <= 10) gerakan = "Berdiri";
  else if (pitch > 10 && pitch <= 35) gerakan = "Takbir/I'tidal";
  else if (pitch <= -20 && pitch >= -60) gerakan = "Ruku'";
  else if (pitch < -60 && pitch >= -120) gerakan = "Sujud";
  else if (pitch > 35 && pitch <= 70) gerakan = "Duduk/Tasyahud";
  
  if (gerakan != gerakanSebelumnya) {
    lcd.setCursor(0, 0);
    lcd.print("Posisi:         "); 
    lcd.setCursor(0, 1);
    lcd.print(gerakan + "          "); 
    Serial.println("{\"sudut\":" + String(pitch, 1) + ",\"gerakan\":\"" + gerakan + "\"}");
    
    gerakanSebelumnya = gerakan;
  }

  delay(300); 
}