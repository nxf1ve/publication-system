package com.app.models;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Year;

public record PublicationRequest(
        @NotBlank @Size(min = 3, max = 200) String title,
        @NotBlank @Size(max = 2000) String authors,
        @NotNull @Min(1900) @Max(9999) Integer year,
        @NotBlank @Pattern(regexp = "Статья|Монография|Доклад") String type,
        @NotBlank @Pattern(regexp = "Информационные системы|Прикладная математика|Вычислительная техника|Программная инженерия|Экономика и управление") String department,
        @NotBlank @Size(max = 200) String owner) {
    @AssertTrue(message = "Year must not exceed next year")
    public boolean isYearValid() { return year == null || year <= Year.now().getValue() + 1; }
}
