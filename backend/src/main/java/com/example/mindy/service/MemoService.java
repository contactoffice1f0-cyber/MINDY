package com.example.mindy.service;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.mindy.Memo;
import com.example.mindy.MemoRepository;
import com.example.mindy.dto.MemoRequest;
import com.example.mindy.dto.MemoResponse;

@Service
public class MemoService {

    private final MemoRepository memoRepository;

    public MemoService(MemoRepository memoRepository) {
        this.memoRepository = memoRepository;
    }

    @Transactional(readOnly = true)
    public List<MemoResponse> findAll() {
        return memoRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(MemoResponse::from)
                .toList();
    }

    @Transactional
    public MemoResponse create(MemoRequest request) {
        Memo memo = new Memo();
        memo.setMemoContent(request.getMemoContent().trim());
        return MemoResponse.from(memoRepository.save(memo));
    }

    @Transactional
    public MemoResponse update(Long id, MemoRequest request) {
        Memo memo = findMemo(id);
        memo.setMemoContent(request.getMemoContent().trim());
        return MemoResponse.from(memoRepository.save(memo));
    }

    @Transactional
    public void delete(Long id) {
        if (!memoRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "memo not found");
        }
        memoRepository.deleteById(id);
    }

    private Memo findMemo(Long id) {
        return memoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "memo not found"));
    }
}
