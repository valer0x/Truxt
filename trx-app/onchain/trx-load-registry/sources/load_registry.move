module trx_load_registry::load_registry {
    use std::string::{Self as string, String};
    use iota::event;
    use iota::object::{Self as object, ID, UID};
    use iota::transfer;
    use iota::tx_context::{Self as tx_context, TxContext};

    const E_EMPTY_ORDER_ID: u64 = 1;
    const E_EMPTY_ISSUER_DID: u64 = 2;
    const E_INVALID_STATE_TRANSITION: u64 = 3;

    const STATE_PENDING: u8 = 0;
    const STATE_BOOKED: u8 = 1;
    const STATE_DONE: u8 = 2;
    const STATE_CANCELLED: u8 = 3;
    const STATE_EXPIRED: u8 = 4;

    public struct Load has key, store {
        id: UID,
        order_id: String,
        fingerprint: String,
        state: u8,
        issuer_did: String,
        carrier_did: String,
        from_location: String,
        to_location: String,
        pickup_date: String,
        pickup_window: String,
        weight: u64,
        reference: String,
        process_type: String,
        load_type: String,
        equipment_requirements_hash: String,
        created_at_ms: u64,
        updated_at_ms: u64,
    }

    public struct LoadCreatedEvent has copy, drop {
        order_id: String,
        load_object_id: ID,
        fingerprint: String,
        state: u8,
        issuer_did: String,
        carrier_did: String,
        from_location: String,
        to_location: String,
        pickup_date: String,
        pickup_window: String,
        weight: u64,
        reference: String,
        process_type: String,
        load_type: String,
        equipment_requirements_hash: String,
        tx_id: String,
        timestamp_ms: u64,
    }

    public struct LoadStateChangedEvent has copy, drop {
        order_id: String,
        load_object_id: ID,
        previous_state: u8,
        new_state: u8,
        issuer_did: String,
        carrier_did: String,
        tx_id: String,
        prev_tx_id: String,
        timestamp_ms: u64,
    }

    public entry fun create_load(
        order_id: String,
        fingerprint: String,
        issuer_did: String,
        from_location: String,
        to_location: String,
        pickup_date: String,
        pickup_window: String,
        weight: u64,
        reference: String,
        process_type: String,
        load_type: String,
        equipment_requirements_hash: String,
        ctx: &mut TxContext,
    ) {
        assert!(!string::is_empty(&order_id), E_EMPTY_ORDER_ID);
        assert!(!string::is_empty(&issuer_did), E_EMPTY_ISSUER_DID);

        let now = tx_context::epoch_timestamp_ms(ctx);
        let mut load = Load {
            id: object::new(ctx),
            order_id,
            fingerprint,
            state: STATE_PENDING,
            issuer_did,
            carrier_did: string::utf8(b""),
            from_location,
            to_location,
            pickup_date,
            pickup_window,
            weight,
            reference,
            process_type,
            load_type,
            equipment_requirements_hash,
            created_at_ms: now,
            updated_at_ms: now,
        };

        event::emit(LoadCreatedEvent {
            order_id: copy load.order_id,
            load_object_id: object::id(&load),
            fingerprint: copy load.fingerprint,
            state: load.state,
            issuer_did: copy load.issuer_did,
            carrier_did: copy load.carrier_did,
            from_location: copy load.from_location,
            to_location: copy load.to_location,
            pickup_date: copy load.pickup_date,
            pickup_window: copy load.pickup_window,
            weight: load.weight,
            reference: copy load.reference,
            process_type: copy load.process_type,
            load_type: copy load.load_type,
            equipment_requirements_hash: copy load.equipment_requirements_hash,
            tx_id: string::utf8(b""),
            timestamp_ms: now,
        });

        transfer::share_object(load);
    }

    public entry fun update_load_state(
        load: &mut Load,
        new_state: u8,
        issuer_did: String,
        carrier_did: String,
        prev_tx_id: String,
        ctx: &mut TxContext,
    ) {
        let previous_state = load.state;
        assert!(is_valid_transition(previous_state, new_state), E_INVALID_STATE_TRANSITION);

        load.state = new_state;
        load.issuer_did = issuer_did;
        load.carrier_did = carrier_did;
        load.updated_at_ms = tx_context::epoch_timestamp_ms(ctx);

        event::emit(LoadStateChangedEvent {
            order_id: copy load.order_id,
            load_object_id: object::id(load),
            previous_state,
            new_state,
            issuer_did: copy load.issuer_did,
            carrier_did: copy load.carrier_did,
            tx_id: string::utf8(b""),
            prev_tx_id,
            timestamp_ms: load.updated_at_ms,
        });
    }

    fun is_valid_transition(current: u8, next: u8): bool {
        if (current == STATE_PENDING) {
            next == STATE_BOOKED || next == STATE_CANCELLED || next == STATE_EXPIRED
        } else if (current == STATE_BOOKED) {
            next == STATE_DONE || next == STATE_CANCELLED
        } else {
            false
        }
    }
}
