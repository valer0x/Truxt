#[test_only]
module trx_load_registry::load_registry_tests {
    use std::string;
    use iota::test_scenario;
    use trx_load_registry::load_registry;

    const STATE_PENDING: u8 = 0;
    const STATE_BOOKED: u8 = 1;
    const STATE_DONE: u8 = 2;
    const STATE_CANCELLED: u8 = 3;
    const STATE_EXPIRED: u8 = 4;

    #[test]
    fun test_create_load_success() {
        let admin = @0xA;
        let mut scenario = test_scenario::begin(admin);
        {
            load_registry::create_load(
                string::utf8(b"ORD-00000001"),
                string::utf8(b"fp_test"),
                string::utf8(b"did:iota:shipper1"),
                string::utf8(b"Rome"),
                string::utf8(b"Milan"),
                string::utf8(b"2025-01-15"),
                string::utf8(b"08:00-12:00"),
                1000,
                string::utf8(b"REF-001"),
                string::utf8(b"Tendering"),
                string::utf8(b"FTL"),
                string::utf8(b"hash123"),
                test_scenario::ctx(&mut scenario),
            );
        };
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_abort(abort_code = 1)]
    fun test_create_load_empty_order_id() {
        let admin = @0xA;
        let mut scenario = test_scenario::begin(admin);
        {
            load_registry::create_load(
                string::utf8(b""),
                string::utf8(b"fp_test"),
                string::utf8(b"did:iota:shipper1"),
                string::utf8(b"Rome"),
                string::utf8(b"Milan"),
                string::utf8(b"2025-01-15"),
                string::utf8(b"08:00-12:00"),
                1000,
                string::utf8(b"REF-001"),
                string::utf8(b"Tendering"),
                string::utf8(b"FTL"),
                string::utf8(b"hash123"),
                test_scenario::ctx(&mut scenario),
            );
        };
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_abort(abort_code = 2)]
    fun test_create_load_empty_issuer_did() {
        let admin = @0xA;
        let mut scenario = test_scenario::begin(admin);
        {
            load_registry::create_load(
                string::utf8(b"ORD-00000001"),
                string::utf8(b"fp_test"),
                string::utf8(b""),
                string::utf8(b"Rome"),
                string::utf8(b"Milan"),
                string::utf8(b"2025-01-15"),
                string::utf8(b"08:00-12:00"),
                1000,
                string::utf8(b"REF-001"),
                string::utf8(b"Tendering"),
                string::utf8(b"FTL"),
                string::utf8(b"hash123"),
                test_scenario::ctx(&mut scenario),
            );
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_update_pending_to_booked() {
        let admin = @0xA;
        let mut scenario = test_scenario::begin(admin);

        test_scenario::next_tx(&mut scenario, admin);
        {
            load_registry::create_load(
                string::utf8(b"ORD-00000001"),
                string::utf8(b"fp_test"),
                string::utf8(b"did:iota:shipper1"),
                string::utf8(b"Rome"),
                string::utf8(b"Milan"),
                string::utf8(b"2025-01-15"),
                string::utf8(b"08:00-12:00"),
                1000,
                string::utf8(b"REF-001"),
                string::utf8(b"Tendering"),
                string::utf8(b"FTL"),
                string::utf8(b"hash123"),
                test_scenario::ctx(&mut scenario),
            );
        };

        test_scenario::next_tx(&mut scenario, admin);
        {
            let mut load = test_scenario::take_shared<load_registry::Load>(&scenario);
            load_registry::update_load_state(
                &mut load,
                STATE_BOOKED,
                string::utf8(b"did:iota:shipper1"),
                string::utf8(b"did:iota:carrier1"),
                string::utf8(b""),
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_shared(load);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_update_booked_to_done() {
        let admin = @0xA;
        let mut scenario = test_scenario::begin(admin);

        test_scenario::next_tx(&mut scenario, admin);
        {
            load_registry::create_load(
                string::utf8(b"ORD-00000001"),
                string::utf8(b"fp_test"),
                string::utf8(b"did:iota:shipper1"),
                string::utf8(b"Rome"),
                string::utf8(b"Milan"),
                string::utf8(b"2025-01-15"),
                string::utf8(b"08:00-12:00"),
                1000,
                string::utf8(b"REF-001"),
                string::utf8(b"Tendering"),
                string::utf8(b"FTL"),
                string::utf8(b"hash123"),
                test_scenario::ctx(&mut scenario),
            );
        };

        test_scenario::next_tx(&mut scenario, admin);
        {
            let mut load = test_scenario::take_shared<load_registry::Load>(&scenario);
            load_registry::update_load_state(
                &mut load,
                STATE_BOOKED,
                string::utf8(b"did:iota:shipper1"),
                string::utf8(b"did:iota:carrier1"),
                string::utf8(b""),
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_shared(load);
        };

        test_scenario::next_tx(&mut scenario, admin);
        {
            let mut load = test_scenario::take_shared<load_registry::Load>(&scenario);
            load_registry::update_load_state(
                &mut load,
                STATE_DONE,
                string::utf8(b"did:iota:shipper1"),
                string::utf8(b"did:iota:carrier1"),
                string::utf8(b"prev_tx_001"),
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_shared(load);
        };

        test_scenario::end(scenario);
    }

    #[test]
    #[expected_abort(abort_code = 3)]
    fun test_invalid_transition_pending_to_done() {
        let admin = @0xA;
        let mut scenario = test_scenario::begin(admin);

        test_scenario::next_tx(&mut scenario, admin);
        {
            load_registry::create_load(
                string::utf8(b"ORD-00000001"),
                string::utf8(b"fp_test"),
                string::utf8(b"did:iota:shipper1"),
                string::utf8(b"Rome"),
                string::utf8(b"Milan"),
                string::utf8(b"2025-01-15"),
                string::utf8(b"08:00-12:00"),
                1000,
                string::utf8(b"REF-001"),
                string::utf8(b"Tendering"),
                string::utf8(b"FTL"),
                string::utf8(b"hash123"),
                test_scenario::ctx(&mut scenario),
            );
        };

        test_scenario::next_tx(&mut scenario, admin);
        {
            let mut load = test_scenario::take_shared<load_registry::Load>(&scenario);
            load_registry::update_load_state(
                &mut load,
                STATE_DONE,
                string::utf8(b"did:iota:shipper1"),
                string::utf8(b"did:iota:carrier1"),
                string::utf8(b""),
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_shared(load);
        };

        test_scenario::end(scenario);
    }

    #[test]
    #[expected_abort(abort_code = 3)]
    fun test_invalid_transition_done_to_booked() {
        let admin = @0xA;
        let mut scenario = test_scenario::begin(admin);

        test_scenario::next_tx(&mut scenario, admin);
        {
            load_registry::create_load(
                string::utf8(b"ORD-00000001"),
                string::utf8(b"fp_test"),
                string::utf8(b"did:iota:shipper1"),
                string::utf8(b"Rome"),
                string::utf8(b"Milan"),
                string::utf8(b"2025-01-15"),
                string::utf8(b"08:00-12:00"),
                1000,
                string::utf8(b"REF-001"),
                string::utf8(b"Tendering"),
                string::utf8(b"FTL"),
                string::utf8(b"hash123"),
                test_scenario::ctx(&mut scenario),
            );
        };

        test_scenario::next_tx(&mut scenario, admin);
        {
            let mut load = test_scenario::take_shared<load_registry::Load>(&scenario);
            load_registry::update_load_state(
                &mut load,
                STATE_BOOKED,
                string::utf8(b"did:iota:shipper1"),
                string::utf8(b"did:iota:carrier1"),
                string::utf8(b""),
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_shared(load);
        };

        test_scenario::next_tx(&mut scenario, admin);
        {
            let mut load = test_scenario::take_shared<load_registry::Load>(&scenario);
            load_registry::update_load_state(
                &mut load,
                STATE_DONE,
                string::utf8(b"did:iota:shipper1"),
                string::utf8(b"did:iota:carrier1"),
                string::utf8(b"prev_tx_001"),
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_shared(load);
        };

        test_scenario::next_tx(&mut scenario, admin);
        {
            let mut load = test_scenario::take_shared<load_registry::Load>(&scenario);
            load_registry::update_load_state(
                &mut load,
                STATE_BOOKED,
                string::utf8(b"did:iota:shipper1"),
                string::utf8(b"did:iota:carrier2"),
                string::utf8(b"prev_tx_002"),
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_shared(load);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_update_pending_to_cancelled() {
        let admin = @0xA;
        let mut scenario = test_scenario::begin(admin);

        test_scenario::next_tx(&mut scenario, admin);
        {
            load_registry::create_load(
                string::utf8(b"ORD-00000001"),
                string::utf8(b"fp_test"),
                string::utf8(b"did:iota:shipper1"),
                string::utf8(b"Rome"),
                string::utf8(b"Milan"),
                string::utf8(b"2025-01-15"),
                string::utf8(b"08:00-12:00"),
                1000,
                string::utf8(b"REF-001"),
                string::utf8(b"Tendering"),
                string::utf8(b"FTL"),
                string::utf8(b"hash123"),
                test_scenario::ctx(&mut scenario),
            );
        };

        test_scenario::next_tx(&mut scenario, admin);
        {
            let mut load = test_scenario::take_shared<load_registry::Load>(&scenario);
            load_registry::update_load_state(
                &mut load,
                STATE_CANCELLED,
                string::utf8(b"did:iota:shipper1"),
                string::utf8(b""),
                string::utf8(b""),
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_shared(load);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_update_pending_to_expired() {
        let admin = @0xA;
        let mut scenario = test_scenario::begin(admin);

        test_scenario::next_tx(&mut scenario, admin);
        {
            load_registry::create_load(
                string::utf8(b"ORD-00000001"),
                string::utf8(b"fp_test"),
                string::utf8(b"did:iota:shipper1"),
                string::utf8(b"Rome"),
                string::utf8(b"Milan"),
                string::utf8(b"2025-01-15"),
                string::utf8(b"08:00-12:00"),
                1000,
                string::utf8(b"REF-001"),
                string::utf8(b"Tendering"),
                string::utf8(b"FTL"),
                string::utf8(b"hash123"),
                test_scenario::ctx(&mut scenario),
            );
        };

        test_scenario::next_tx(&mut scenario, admin);
        {
            let mut load = test_scenario::take_shared<load_registry::Load>(&scenario);
            load_registry::update_load_state(
                &mut load,
                STATE_EXPIRED,
                string::utf8(b"did:iota:shipper1"),
                string::utf8(b""),
                string::utf8(b""),
                test_scenario::ctx(&mut scenario),
            );
            test_scenario::return_shared(load);
        };

        test_scenario::end(scenario);
    }
}
