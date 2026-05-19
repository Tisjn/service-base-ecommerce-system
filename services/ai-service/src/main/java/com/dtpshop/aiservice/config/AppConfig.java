package com.dtpshop.aiservice.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties({GoogleAiProperties.class, AiContextProperties.class})
public class AppConfig {

    @Bean
    RestClient restClient(RestClient.Builder builder) {
        return builder.build();
    }
}
