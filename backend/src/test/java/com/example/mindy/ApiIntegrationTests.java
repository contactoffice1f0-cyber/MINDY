package com.example.mindy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApiIntegrationTests {

    @LocalServerPort
    private int port;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private MemoRepository memoRepository;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @BeforeEach
    void cleanUp() {
        taskRepository.deleteAll();
        memoRepository.deleteAll();
    }

    @Test
    void taskCrudFlow() throws Exception {
        HttpResponse<String> created = request(
                "POST",
                "/tasks",
                "{\"task_name\":\"メールを返す\",\"due_date\":\"2026-11-02\",\"category\":\"仕事\"}");
        assertEquals(201, created.statusCode(), created.body());
        assertEquals("メールを返す", JsonPath.read(created.body(), "$.task_name"));
        assertEquals("2026-11-02", JsonPath.read(created.body(), "$.due_date"));
        assertEquals("仕事", JsonPath.read(created.body(), "$.category"));
        assertEquals(false, JsonPath.read(created.body(), "$.is_completed"));
        assertNotNull(JsonPath.read(created.body(), "$.created_at"));

        Number id = JsonPath.read(created.body(), "$.id");

        HttpResponse<String> list = request("GET", "/tasks", null);
        assertEquals(200, list.statusCode());
        assertEquals(1, ((List<?>) JsonPath.read(list.body(), "$")).size());

        HttpResponse<String> updated = request(
                "PUT",
                "/tasks/" + id.longValue(),
                "{\"task_name\":\"メールを1通返す\",\"due_date\":\"2026-11-03\",\"category\":\"仕事\",\"is_completed\":true}");
        assertEquals(200, updated.statusCode(), updated.body());
        assertEquals("メールを1通返す", JsonPath.read(updated.body(), "$.task_name"));
        assertEquals("2026-11-03", JsonPath.read(updated.body(), "$.due_date"));
        assertEquals(true, JsonPath.read(updated.body(), "$.is_completed"));

        HttpResponse<String> deleted = request("DELETE", "/tasks/" + id.longValue(), null);
        assertEquals(200, deleted.statusCode(), deleted.body());

        HttpResponse<String> afterDelete = request("GET", "/tasks", null);
        assertEquals(0, ((List<?>) JsonPath.read(afterDelete.body(), "$")).size());
    }

    @Test
    void createTaskWithoutNameReturnsBadRequest() throws Exception {
        HttpResponse<String> response = request("POST", "/tasks", "{\"due_date\":\"2026-11-02\"}");
        assertEquals(400, response.statusCode(), response.body());
    }

    @Test
    void updateMissingTaskReturnsNotFound() throws Exception {
        HttpResponse<String> response = request(
                "PUT",
                "/tasks/999999",
                "{\"task_name\":\"存在しない\",\"is_completed\":false}");
        assertEquals(404, response.statusCode(), response.body());
    }

    @Test
    void deleteMissingTaskReturnsNotFound() throws Exception {
        HttpResponse<String> response = request("DELETE", "/tasks/999999", null);
        assertEquals(404, response.statusCode(), response.body());
    }

    @Test
    void updateTaskWithInvalidBodyReturnsBadRequest() throws Exception {
        HttpResponse<String> created = request("POST", "/tasks", "{\"task_name\":\"確認\"}");
        Number id = JsonPath.read(created.body(), "$.id");

        HttpResponse<String> response = request(
                "PUT",
                "/tasks/" + id.longValue(),
                "{\"due_date\":\"not-a-date\"}");
        assertEquals(400, response.statusCode(), response.body());
    }

    @Test
    void memoCrudFlow() throws Exception {
        HttpResponse<String> created = request("POST", "/memos", "{\"memo_content\":\"あとで確認する\"}");
        assertEquals(201, created.statusCode(), created.body());
        assertEquals("あとで確認する", JsonPath.read(created.body(), "$.memo_content"));
        assertNotNull(JsonPath.read(created.body(), "$.created_at"));

        Number id = JsonPath.read(created.body(), "$.id");

        HttpResponse<String> list = request("GET", "/memos", null);
        assertEquals(200, list.statusCode());
        assertEquals(1, ((List<?>) JsonPath.read(list.body(), "$")).size());

        HttpResponse<String> updated = request(
                "PUT",
                "/memos/" + id.longValue(),
                "{\"memo_content\":\"やっぱり明日確認する\"}");
        assertEquals(200, updated.statusCode(), updated.body());
        assertEquals("やっぱり明日確認する", JsonPath.read(updated.body(), "$.memo_content"));

        HttpResponse<String> deleted = request("DELETE", "/memos/" + id.longValue(), null);
        assertEquals(200, deleted.statusCode(), deleted.body());

        HttpResponse<String> afterDelete = request("GET", "/memos", null);
        assertEquals(0, ((List<?>) JsonPath.read(afterDelete.body(), "$")).size());
    }

    @Test
    void createMemoWithoutContentReturnsBadRequest() throws Exception {
        HttpResponse<String> response = request("POST", "/memos", "{}");
        assertEquals(400, response.statusCode(), response.body());
    }

    @Test
    void deleteMissingMemoReturnsNotFound() throws Exception {
        HttpResponse<String> response = request("DELETE", "/memos/999999", null);
        assertEquals(404, response.statusCode(), response.body());
        assertTrue(response.body().contains("error"));
    }

    private HttpResponse<String> request(String method, String path, String body) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Content-Type", "application/json");

        switch (method) {
            case "GET" -> builder.GET();
            case "POST" -> builder.POST(HttpRequest.BodyPublishers.ofString(body));
            case "PUT" -> builder.PUT(HttpRequest.BodyPublishers.ofString(body));
            case "DELETE" -> builder.DELETE();
            default -> throw new IllegalArgumentException("Unsupported method: " + method);
        }

        return httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }
}
