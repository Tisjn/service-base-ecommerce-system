package com.dtpshop.productservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CategoryRequest {

    @NotBlank
    @Size(min = 3, max = 100)
    private String name;

    @NotBlank
    @Size(min = 3, max = 100)
    @Pattern(regexp = "^[a-z0-9-]+$", message = "slug must contain only lowercase letters, numbers and hyphens")
    private String slug;
}
