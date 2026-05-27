package com.dtpshop.productservice.repository;

import com.dtpshop.productservice.model.OutboxEvent;
import com.dtpshop.productservice.model.OutboxEventStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, String> {

    List<OutboxEvent> findTop50ByStatusOrderByCreatedAtAsc(OutboxEventStatus status);
}
