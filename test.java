package com.db.mbms.evault.service.impl;

import com.db.mbms.evault.dto.DocmagicAccessTokenResponseDto;
import com.db.mbms.evault.dto.DocmagicDownloadFileDto;
import com.db.mbms.evault.utils.EvaultCommonConstants;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.util.EntityUtils;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DocmagicFileDownloadServiceImplTest {

    @Mock
    private CloseableHttpClient httpClient;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private HttpResponse httpResponse;

    @Mock
    private HttpEntity httpEntity;

    @InjectMocks
    private DocmagicFileDownloadServiceImpl service;

    private final String testDownloadUrl = "http://test.com/";

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
        service = new DocmagicFileDownloadServiceImpl(httpClient, objectMapper);

        // Use reflection to inject the private field values
        service.getClass().getDeclaredFields();
        setPrivateField(service, "downloadUrl", testDownloadUrl);
    }

    private void setPrivateField(Object target, String fieldName, String value) {
        try {
            var field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void testDownloadPdf_successful() throws Exception {
        Long docId = 123L;
        DocmagicAccessTokenResponseDto token = new DocmagicAccessTokenResponseDto();
        token.setAccessToken("dummy-token");

        String url = testDownloadUrl + docId + "/Download/smartDocumentAsPDF=true";
        String dummyJson = "{\"someField\": \"someValue\"}";
        InputStream inputStream = new ByteArrayInputStream(dummyJson.getBytes());

        when(httpClient.execute(any(HttpGet.class))).thenReturn(httpResponse);
        when(httpResponse.getEntity()).thenReturn(httpEntity);
        when(httpEntity.getContent()).thenReturn(inputStream);

        DocmagicDownloadFileDto expectedDto = new DocmagicDownloadFileDto();
        when(objectMapper.readValue(any(InputStream.class), eq(DocmagicDownloadFileDto.class))).thenReturn(expectedDto);

        DocmagicDownloadFileDto actualDto = service.downloadPdf(docId, token);

        assertNotNull(actualDto);
        verify(httpClient, times(1)).execute(any(HttpGet.class));
        verify(objectMapper, times(1)).readValue(any(InputStream.class), eq(DocmagicDownloadFileDto.class));
    }

    @Test
    void testDownloadPdf_throwsException() throws Exception {
        Long docId = 123L;
        DocmagicAccessTokenResponseDto token = new DocmagicAccessTokenResponseDto();
        token.setAccessToken("dummy-token");

        when(httpClient.execute(any(HttpGet.class))).thenThrow(new RuntimeException("Connection error"));

        DocmagicDownloadFileDto result = service.downloadPdf(docId, token);

        assertNotNull(result); // Still returns a DTO (might be empty depending on your implementation)
        verify(httpClient, times(1)).execute(any(HttpGet.class));
    }
}