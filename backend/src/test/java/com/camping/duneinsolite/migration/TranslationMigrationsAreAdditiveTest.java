package com.camping.duneinsolite.migration;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The translation migrations (V66 onward, until the translation work is done) may only ADD: new
 * tables and new nullable columns. Deploying them must never remove, rewrite or retype data that is
 * already in production. This turns that promise into a check that fails the build, not a comment.
 */
class TranslationMigrationsAreAdditiveTest {

    private static final Path DIR = Path.of("src/main/resources/db/migration");
    /** Versions owned by the translation work; other teams' migrations are not judged here. */
    private static final List<String> OWNED = List.of("V66__", "V67__", "V68__");

    private static final Pattern DESTRUCTIVE = Pattern.compile(
            "\\b(DROP\\s+(TABLE|COLUMN|CONSTRAINT|INDEX|SCHEMA|TYPE)|DELETE\\s+FROM|TRUNCATE|UPDATE\\s+\\w+\\s+SET"
                    + "|ALTER\\s+TABLE\\s+\\S+\\s+(ALTER\\s+COLUMN|DROP|RENAME)|RENAME\\s+(TO|COLUMN)|ALTER\\s+COLUMN"
                    + "|SET\\s+NOT\\s+NULL|CASCADE)\\b",
            Pattern.CASE_INSENSITIVE);

    private static String sqlWithoutComments(Path file) throws IOException {
        StringBuilder sb = new StringBuilder();
        for (String line : Files.readAllLines(file, StandardCharsets.UTF_8)) {
            int c = line.indexOf("--");
            sb.append(c >= 0 ? line.substring(0, c) : line).append('\n');
        }
        return sb.toString();
    }

    private static List<Path> ownedMigrations() throws IOException {
        try (Stream<Path> files = Files.list(DIR)) {
            return files.filter(p -> OWNED.stream().anyMatch(prefix -> p.getFileName().toString().startsWith(prefix))).toList();
        }
    }

    @Test
    void translationMigrationsNeverRemoveRewriteOrRetypeExistingData() throws IOException {
        List<Path> files = ownedMigrations();
        assertThat(files).as("the translation migrations exist").isNotEmpty();
        for (Path file : files) {
            assertThat(DESTRUCTIVE.matcher(sqlWithoutComments(file)).find())
                    .as(file.getFileName() + " must only add tables and nullable columns")
                    .isFalse();
        }
    }

    @Test
    void everyNewTableAndColumnIsGuardedSoARerunIsHarmless() throws IOException {
        for (Path file : ownedMigrations()) {
            String sql = sqlWithoutComments(file);
            assertThat(sql).as(file.getFileName() + " creates tables idempotently")
                    .doesNotContainPattern(Pattern.compile("CREATE\\s+TABLE\\s+(?!IF\\s+NOT\\s+EXISTS)", Pattern.CASE_INSENSITIVE));
            assertThat(sql).as(file.getFileName() + " adds columns idempotently")
                    .doesNotContainPattern(Pattern.compile("ADD\\s+COLUMN\\s+(?!IF\\s+NOT\\s+EXISTS)", Pattern.CASE_INSENSITIVE));
        }
    }
}
