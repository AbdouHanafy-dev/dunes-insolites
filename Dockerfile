# syntax=docker/dockerfile:1

# ---- Stage 1: build the jar with Maven, via the project's own wrapper ----
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /app

# Dependency layer first - cached and skipped on rebuilds unless pom.xml/mvnw/.mvn change.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw
RUN ./mvnw -B dependency:go-offline

# Source layer - only this re-runs when src/ changes.
COPY src ./src
RUN ./mvnw -B clean package -DskipTests

# ---- Stage 2: minimal runtime image ----
FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app

# curl -> HEALTHCHECK below. fontconfig/fonts-dejavu-core -> openhtmltopdf needs
# real font metrics to render invoice PDFs; Alpine/musl lacks these by default.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl fontconfig fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system spring && adduser --system --ingroup spring spring
USER spring:spring

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=5 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
