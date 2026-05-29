package com.dtpshop.aiservice.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties({GoogleAiProperties.class, AiContextProperties.class, AiAgentProperties.class})
public class AppConfig {

    @Bean
    RestClient restClient(RestClient.Builder builder) {
        return builder
                .requestFactory(new HttpComponentsClientHttpRequestFactory())
                .build();
    }
}
