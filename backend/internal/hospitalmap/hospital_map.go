package hospitalmap

import (
	"encoding/json"
	"errors"

	"github.com/suttipong/hospital-carepath/internal/model"
	"gorm.io/gorm"
)

const defaultScope = "default"

var ErrNotFound = errors.New("hospital map not found")

type Store struct {
	db *gorm.DB
}

func NewStore(db *gorm.DB) *Store {
	return &Store{db: db}
}

func (s *Store) Get() (*model.HospitalMap, error) {
	var hospitalMap model.HospitalMap
	if err := s.db.Where("scope = ?", defaultScope).First(&hospitalMap).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &hospitalMap, nil
}

func (s *Store) Save(nodes, edges any) (*model.HospitalMap, error) {
	nodesJSON, err := json.Marshal(nodes)
	if err != nil {
		return nil, err
	}
	edgesJSON, err := json.Marshal(edges)
	if err != nil {
		return nil, err
	}

	var hospitalMap model.HospitalMap
	err = s.db.Transaction(func(tx *gorm.DB) error {
		result := tx.Where("scope = ?", defaultScope).First(&hospitalMap)
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			hospitalMap = model.HospitalMap{
				Scope: defaultScope,
				Nodes: string(nodesJSON),
				Edges: string(edgesJSON),
			}
			return tx.Create(&hospitalMap).Error
		}
		if result.Error != nil {
			return result.Error
		}

		if err := tx.Model(&hospitalMap).Updates(map[string]any{
			"nodes": string(nodesJSON),
			"edges": string(edgesJSON),
		}).Error; err != nil {
			return err
		}
		return tx.First(&hospitalMap, hospitalMap.ID).Error
	})
	if err != nil {
		return nil, err
	}
	return &hospitalMap, nil
}
