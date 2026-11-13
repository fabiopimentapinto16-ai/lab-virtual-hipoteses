plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "br.lab.hipoteses"
    compileSdk = 34
    defaultConfig {
        applicationId = "br.lab.hipoteses"
        minSdk = 29
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
// O app web (dist/) é copiado para src/main/assets/www pelo CI antes do build.
