package com.example.mindy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class MemoRequest {

    @NotBlank(message = "memo_content is required")
    @Size(max = 2000, message = "memo_content must be 2000 characters or less")
    private String memoContent;

    public String getMemoContent() {
        return memoContent;
    }

    public void setMemoContent(String memoContent) {
        this.memoContent = memoContent;
    }
}
